<?php
/**
 * Plugin Name: Unpress — AI Website Migration
 * Description: Scans your WordPress site for migration to a modern AI-powered stack. Read-only — never modifies your content.
 * Version: 0.1.0
 * Author: Amir Baldiga
 * Author URI: https://linkedin.com/in/amirbaldiag
 * License: MIT
 * Requires at least: 5.6
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

define('UNPRESS_VERSION', '0.1.0');
define('UNPRESS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('UNPRESS_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once UNPRESS_PLUGIN_DIR . 'includes/class-scanner.php';
require_once UNPRESS_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once UNPRESS_PLUGIN_DIR . 'includes/class-trust-badge.php';

add_action('rest_api_init', ['Unpress_Rest_Api', 'register_routes']);
add_action('admin_menu', ['Unpress_Trust_Badge', 'add_admin_page']);
add_action('admin_init', ['Unpress_Trust_Badge', 'register_settings']);

register_activation_hook(__FILE__, 'unpress_activate');

function unpress_activate() {
    $user = wp_get_current_user();
    if (!$user || !$user->ID) return;

    $app_pass = WP_Application_Passwords::create_new_application_password(
        $user->ID,
        ['name' => 'Unpress Migration (Read-Only)']
    );

    if (!is_wp_error($app_pass)) {
        set_transient('unpress_auth_token_display', $app_pass[0], HOUR_IN_SECONDS);
        update_option('unpress_auth_user', $user->user_login);
    }
}

register_deactivation_hook(__FILE__, 'unpress_deactivate');

function unpress_deactivate() {
    delete_transient('unpress_auth_token_display');
    delete_option('unpress_auth_user');
    delete_option('unpress_user_verified');
}
