<?php
defined('ABSPATH') || exit;

class Unpress_Rest_Api {

    public static function register_routes() {
        register_rest_route('unpress/v1', '/manifest', [
            'methods' => 'GET',
            'callback' => [self::class, 'get_manifest'],
            'permission_callback' => [self::class, 'check_permission'],
        ]);

        register_rest_route('unpress/v1', '/health', [
            'methods' => 'GET',
            'callback' => fn() => new WP_REST_Response([
                'status' => 'ok',
                'version' => UNPRESS_VERSION,
                'wp_version' => get_bloginfo('version'),
            ]),
            'permission_callback' => '__return_true',
        ]);
    }

    public static function check_permission(WP_REST_Request $request): bool {
        return current_user_can('manage_options');
    }

    public static function get_manifest(WP_REST_Request $request): WP_REST_Response {
        $verified = get_option('unpress_user_verified', false);
        if (!$verified) {
            return new WP_REST_Response([
                'error' => 'Plugin not verified by user. Please complete the trust verification in WP admin → Unpress.',
            ], 403);
        }
        $manifest = Unpress_Scanner::generate_manifest();
        return new WP_REST_Response($manifest);
    }
}
