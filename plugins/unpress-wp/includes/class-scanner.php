<?php
defined('ABSPATH') || exit;

class Unpress_Scanner {

    public static function generate_manifest(): array {
        return [
            'version' => '1.0',
            'generated_at' => gmdate('c'),
            'wp_version' => get_bloginfo('version'),
            'site_url' => get_site_url(),
            'site_name' => get_bloginfo('name'),
            'permalink_structure' => get_option('permalink_structure', '/%postname%/'),
            'content' => self::scan_content(),
            'media' => self::scan_media(),
            'taxonomy' => self::scan_taxonomy(),
            'navigation' => self::scan_navigation(),
            'seo' => self::scan_seo(),
            'legal_pages' => self::scan_legal_pages(),
            'tracking' => self::scan_tracking(),
            'sitemap' => self::scan_sitemap(),
            'theme' => self::scan_theme(),
            'plugins' => self::scan_plugins(),
            'acf_fields' => self::scan_acf_fields(),
            'wp_admin_structure' => self::scan_admin_structure(),
        ];
    }

    private static function scan_content(): array {
        $result = [
            'posts' => self::scan_post_type('post'),
            'pages' => self::scan_post_type('page'),
            'custom_post_types' => [],
        ];
        $custom_types = get_post_types(['_builtin' => false, 'public' => true], 'names');
        foreach ($custom_types as $type) {
            $result['custom_post_types'][$type] = self::scan_post_type($type);
        }
        return $result;
    }

    private static function scan_post_type(string $type): array {
        $posts = get_posts([
            'post_type' => $type,
            'post_status' => ['publish', 'draft', 'private'],
            'numberposts' => -1,
            'fields' => 'ids',
        ]);
        $items = [];
        $sample_fields = [];
        $has_custom = false;
        foreach ($posts as $post_id) {
            $post = get_post($post_id);
            $items[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'slug' => $post->post_name,
                'status' => $post->post_status,
                'date' => $post->post_date_gmt,
            ];
            $meta = get_post_meta($post_id);
            if (!empty($meta)) {
                $has_custom = true;
                foreach (array_keys($meta) as $key) {
                    if (!str_starts_with($key, '_') && !in_array($key, $sample_fields)) {
                        $sample_fields[] = $key;
                    }
                }
            }
        }
        return [
            'count' => count($items),
            'sample_fields' => array_slice($sample_fields, 0, 20),
            'has_custom_fields' => $has_custom,
            'items' => $items,
        ];
    }

    private static function scan_media(): array {
        $attachments = get_posts([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'numberposts' => -1,
        ]);
        $items = [];
        foreach ($attachments as $att) {
            $items[] = [
                'id' => $att->ID,
                'url' => wp_get_attachment_url($att->ID),
                'mime' => $att->post_mime_type,
                'size' => filesize(get_attached_file($att->ID)) ?: 0,
                'alt' => get_post_meta($att->ID, '_wp_attachment_image_alt', true) ?: '',
            ];
        }
        return ['total' => count($items), 'items' => $items];
    }

    private static function scan_taxonomy(): array {
        $categories = get_categories(['hide_empty' => false]);
        $tags = get_tags(['hide_empty' => false]);
        $cats = array_map(fn($c) => [
            'id' => $c->term_id, 'name' => $c->name,
            'slug' => $c->slug, 'parent' => $c->parent ?: null,
        ], $categories);
        $tag_list = array_map(fn($t) => [
            'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug,
        ], $tags);
        $custom = [];
        $custom_taxonomies = get_taxonomies(['_builtin' => false, 'public' => true], 'names');
        foreach ($custom_taxonomies as $tax) {
            $terms = get_terms(['taxonomy' => $tax, 'hide_empty' => false]);
            if (!is_wp_error($terms)) {
                $custom[$tax] = array_map(fn($t) => [
                    'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug,
                ], $terms);
            }
        }
        return ['categories' => $cats, 'tags' => $tag_list, 'custom' => $custom];
    }

    private static function scan_navigation(): array {
        $menus = wp_get_nav_menus();
        $result = [];
        foreach ($menus as $menu) {
            $locations = get_nav_menu_locations();
            $location = array_search($menu->term_id, $locations) ?: 'unassigned';
            $items = wp_get_nav_menu_items($menu->term_id);
            $result[] = [
                'name' => $menu->name,
                'location' => $location,
                'items' => self::build_menu_tree($items ?: []),
            ];
        }
        return ['menus' => $result];
    }

    private static function build_menu_tree(array $items, int $parent = 0): array {
        $tree = [];
        foreach ($items as $item) {
            if ((int)$item->menu_item_parent === $parent) {
                $tree[] = [
                    'title' => $item->title,
                    'url' => $item->url,
                    'type' => $item->type === 'post_type' ? $item->object : 'custom',
                    'target_id' => (int)$item->object_id ?: null,
                    'children' => self::build_menu_tree($items, $item->ID),
                ];
            }
        }
        return $tree;
    }

    private static function scan_seo(): array {
        $plugin = 'none';
        if (is_plugin_active('wordpress-seo/wp-seo.php')) $plugin = 'yoast';
        elseif (is_plugin_active('seo-by-rank-math/rank-math.php')) $plugin = 'rankmath';
        elseif (is_plugin_active('all-in-one-seo-pack/all_in_one_seo_pack.php')) $plugin = 'aioseo';
        $per_content = [];
        if ($plugin === 'yoast') {
            $posts = get_posts(['numberposts' => -1, 'post_type' => 'any', 'post_status' => 'publish']);
            foreach ($posts as $post) {
                $title = get_post_meta($post->ID, '_yoast_wpseo_title', true);
                $desc = get_post_meta($post->ID, '_yoast_wpseo_metadesc', true);
                if ($title || $desc) {
                    $per_content[$post->ID] = [
                        'title' => $title ?: '',
                        'description' => $desc ?: '',
                        'og_image' => get_post_meta($post->ID, '_yoast_wpseo_opengraph-image', true) ?: null,
                    ];
                }
            }
        }
        return [
            'plugin' => $plugin,
            'global' => [
                'title_template' => get_option('blogname') . ' — %s',
                'meta_description' => get_option('blogdescription'),
            ],
            'per_content' => $per_content,
        ];
    }

    private static function scan_legal_pages(): array {
        $privacy = (int)get_option('wp_page_for_privacy_policy');
        return ['privacy' => $privacy ?: null, 'terms' => null, 'accessibility' => null, 'custom' => []];
    }

    private static function scan_tracking(): array {
        $ga_id = null;
        $gtm_id = null;
        $mi = get_option('monsterinsights_site_profile');
        if ($mi && isset($mi['ua'])) $ga_id = $mi['ua'];
        $sk = get_option('googlesitekit_analytics_settings');
        if ($sk && isset($sk['propertyID'])) $ga_id = $sk['propertyID'];
        return ['ga_id' => $ga_id, 'gtm_id' => $gtm_id, 'meta_pixel_id' => null, 'custom_scripts' => []];
    }

    private static function scan_sitemap(): array {
        $sitemap_url = get_sitemap_url('index');
        return ['url' => $sitemap_url ?: null, 'entries' => []];
    }

    private static function scan_theme(): array {
        $theme = wp_get_theme();
        return ['name' => $theme->get('Name'), 'is_block_theme' => wp_is_block_theme()];
    }

    private static function scan_plugins(): array {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $active = [];
        foreach (get_option('active_plugins', []) as $plugin_path) {
            $data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin_path);
            $active[] = ['slug' => dirname($plugin_path), 'name' => $data['Name'], 'version' => $data['Version']];
        }
        $page_builder = 'none';
        $builders = [
            'elementor' => 'elementor/elementor.php',
            'divi' => 'divi-builder/divi-builder.php',
            'wpbakery' => 'js_composer/js_composer.php',
            'beaver' => 'bb-plugin/fl-builder.php',
        ];
        foreach ($builders as $name => $path) {
            if (is_plugin_active($path)) { $page_builder = $name; break; }
        }
        return ['active' => $active, 'page_builder' => $page_builder];
    }

    private static function scan_acf_fields(): array {
        if (!function_exists('acf_get_field_groups')) return [];
        $result = [];
        foreach (acf_get_field_groups() as $group) {
            $fields = acf_get_fields($group['key']);
            $result[$group['title']] = array_map(fn($f) => [
                'name' => $f['name'], 'type' => $f['type'], 'choices' => $f['choices'] ?? null,
            ], $fields ?: []);
        }
        return $result;
    }

    private static function scan_admin_structure(): array {
        global $menu;
        $sidebar = [];
        if (is_array($menu)) {
            foreach ($menu as $item) {
                if (!empty($item[0]) && !empty(strip_tags($item[0]))) {
                    $sidebar[] = strip_tags($item[0]);
                }
            }
        }
        return ['sidebar_order' => $sidebar, 'field_groups' => []];
    }
}
