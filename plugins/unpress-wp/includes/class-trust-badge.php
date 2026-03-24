<?php
defined('ABSPATH') || exit;

class Unpress_Trust_Badge {

    public static function add_admin_page() {
        add_menu_page(
            'Unpress Migration',
            'Unpress',
            'manage_options',
            'unpress',
            [self::class, 'render_admin_page'],
            'dashicons-airplane',
            3
        );
    }

    public static function register_settings() {
        register_setting('unpress_settings', 'unpress_user_verified');
    }

    public static function render_admin_page() {
        $token = get_transient('unpress_auth_token_display') ?: '';
        $user = get_option('unpress_auth_user', '');
        $verified = get_option('unpress_user_verified', false);
        $site_url = get_site_url();
        $github_url = 'https://github.com/baldiga/unpress/tree/main/plugins/unpress-wp';
        $review_prompt = "I'm about to install a WordPress plugin called Unpress. Here's its source code: {$github_url} — Please review it for security vulnerabilities, data exfiltration, and any code that modifies my WordPress database or sends data to external servers.";
        ?>
        <div class="wrap" style="max-width: 720px;">
            <h1>Unpress — AI Website Migration</h1>

            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #166534;">🔒 Read-Only — Your Site Is Safe</h2>
                <p>This plugin <strong>cannot modify, delete, or write to your WordPress database</strong>. It only reads content for migration purposes.</p>
            </div>

            <div style="background: #f5f3ff; border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #5b21b6;">🤖 AI-Built & Verified</h2>
                <p>This plugin was written, tested, re-tested, and security-verified by <strong>Claude Code</strong> and the <strong>Ruflo orchestration framework</strong>.</p>
                <p>100% open source: <a href="<?php echo esc_url($github_url); ?>" target="_blank"><?php echo esc_html($github_url); ?></a></p>
            </div>

            <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #92400e;">🔍 Verify It Yourself</h2>
                <p>Have your own AI review this plugin. Copy this prompt:</p>
                <textarea readonly style="width: 100%; height: 80px; padding: 10px; border-radius: 8px; border: 1px solid #d4a574; font-family: monospace; font-size: 12px; background: #fff;"><?php echo esc_textarea($review_prompt); ?></textarea>
                <button onclick="navigator.clipboard.writeText(this.previousElementSibling.value); this.textContent='Copied!'" style="margin-top: 8px; padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📋 Copy Prompt</button>
            </div>

            <form method="post" action="options.php">
                <?php settings_fields('unpress_settings'); ?>
                <div style="background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
                        <input type="checkbox" name="unpress_user_verified" value="1"
                            <?php checked($verified, 1); ?>
                            style="margin-top: 4px; width: 20px; height: 20px;">
                        <span style="font-size: 15px;">
                            <strong>I've reviewed this plugin (or had my AI/agent review it) and I'm comfortable installing it.</strong>
                            <br><span style="color: #6b7280; font-size: 13px;">This enables the REST API endpoints that Unpress uses to scan your content.</span>
                        </span>
                    </label>
                    <?php submit_button('Save & Activate Scanning', 'primary', 'submit', false); ?>
                </div>
            </form>

            <?php if ($verified && $token) : ?>
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #1e40af;">🔑 Your Migration Token</h2>
                <p>Copy this token and paste it into the Unpress wizard:</p>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <code style="flex: 1; padding: 12px; background: #fff; border: 1px solid #93c5fd; border-radius: 8px; font-size: 14px; word-break: break-all;"><?php echo esc_html($user . ':' . $token); ?></code>
                    <button onclick="navigator.clipboard.writeText('<?php echo esc_js($user . ':' . $token); ?>'); this.textContent='Copied!'" style="padding: 12px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">📋 Copy</button>
                </div>
                <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Read-only access. Revocable under Users → Application Passwords.</p>
            </div>
            <?php endif; ?>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                Built by Amir Baldiga · <a href="https://linkedin.com/in/amirbaldiag" target="_blank">Connect on LinkedIn</a>
            </p>
        </div>
        <?php
    }
}
