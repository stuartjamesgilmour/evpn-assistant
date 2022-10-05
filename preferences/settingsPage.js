'use strict';

// 
// extension evpn-assistant - settingsPage.js
// JavaScript Gnome extension for ExpressVPN Shell Control.
// 
// @author    : Stuart J Gilmour
// @copyright : Copyright 2022, Stuart J Gilmour.
//
// Reference Materal:
// https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.PreferencesGroup.html
// https://docs.gtk.org/gtk3/index.html
// https://github.com/aha999/DonateButtons
// https://github.com/Ileriayo/markdown-badges

//
// @license
//
// Copyright 2022, Stuart J Gilmour
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

const { Adw, GLib, Gdk, Gtk, GObject, GdkPixbuf } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var SettingsPage = GObject.registerClass(
    class EvpnAssistantSettingsPage extends Adw.PreferencesPage 
    {
        //
        // General settings page initialisation
        //

        _init(settings) 
        {
            super._init({ title: _("Settings"), icon_name: 'preferences-system-symbolic', name: 'GeneralPage' });
            this._settings = settings;

            let headerGroup = new Adw.PreferencesGroup();

            let orientationBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, hexpand: false, vexpand: false });

            let headingLabel = new Gtk.Label({
                label: '<span size="larger"><b>EVPN Assistant</b></span>',
                use_markup: true,
                margin_bottom: 15,
                vexpand: true,
                valign: Gtk.Align.FILL
            });

            let subheadingLabel = new Gtk.Label({
                label: '<span size="smaller"><i>The unofficial GNOME assistant by Stuart J Gilmour</i></span>',
                use_markup: true,
                margin_bottom: 15,
                vexpand: true,
                valign: Gtk.Align.FILL
            });

            let oneLinePlugDescription = new Gtk.Label({
                label: _("Allows ExpressVPN to be controlled through the GNOME shell"),
                margin_bottom: 3,
                hexpand: false,
                vexpand: false
            });

            orientationBox.append(headingLabel);
            orientationBox.append(subheadingLabel);
            orientationBox.append(oneLinePlugDescription);

            headerGroup.add(orientationBox);

            // Add the header to the page
            this.add(headerGroup);

            // General Settings
            let generalGroup = new Adw.PreferencesGroup({ title: _("General Settings") });

            //
            // Toggle polling on or off
            //

            let togglePollingSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: this._settings.get_boolean('polling-on-off-toggle')
            });

            let togglePollingRow = new Adw.ActionRow({
                title: _("Allow Polling"),
                subtitle: _("Turns VPN status polling on or off"),
                activatable_widget: togglePollingSwitch
            });

            togglePollingSwitch.connect('notify::active', (widget) =>
            {
                this._settings.set_boolean('polling-on-off-toggle', widget.get_active());
            });

            togglePollingRow.add_suffix(togglePollingSwitch);
            generalGroup.add(togglePollingRow);

            //
            // Current polling interval - min 10sec, max 10mins
            //

            let pollingIntervalSpinButton = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 10,
                    upper: 600,
                    step_increment: 1,
                    page_increment: 10,
                    value: this._settings.get_int('polling-interval')
                }),
                climb_rate: 5,
                numeric: true,
                update_policy: 'if-valid',
                valign: Gtk.Align.CENTER
            });

            let pollingIntervalRow = new Adw.ActionRow({
                title: _("Current Polling Interval"),
                subtitle: _("Interval in seconds for refreshing the VPN status"),
                activatable_widget: pollingIntervalSpinButton
            });

            pollingIntervalSpinButton.connect('value-changed', (widget) =>
            {
                this._settings.set_int('polling-interval', widget.get_value());
            });

            pollingIntervalRow.add_suffix(pollingIntervalSpinButton);
            generalGroup.add(pollingIntervalRow);

            //
            // Where do you want to display the extension 
            //

            let panelPos = new Gtk.StringList();
            panelPos.append(_("Center"));
            panelPos.append(_("Right"));
            panelPos.append(_("Left"));
            let panelPosRow = new Adw.ComboRow({
                title: _("Position In Panel"),
                subtitle: _("Where should the extension be positioned on the desktop"),
                model: panelPos,
                selected: this._settings.get_enum('position-in-panel')
            });

            panelPosRow.connect("notify::selected", (widget) =>
            {
                this._settings.set_enum('position-in-panel', widget.selected);
            });

            generalGroup.add(panelPosRow);

            //
            // Toggle logging on or off
            //

            let toggleLoggingSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: this._settings.get_boolean('logging-on-off-toggle')
            });

            let toggleLoggingRow = new Adw.ActionRow({
                title: _("Allow Logging"),
                subtitle: _("Turns logging events on / off - [Evpn Info] | [Evpn Debug] | [Evpn Trace]"),
                tooltip_text: _("If you have any issues, logs can be captured via the following cmd, creating a logfile at the root of your home directory: journalctl -f /usr/bin/gnome-shell 2>&1 | grep -i Evpn > ~/evpn-assistant.log &"),
                activatable_widget: toggleLoggingSwitch
            });

            toggleLoggingSwitch.connect('notify::active', (widget) =>
            {
                this._settings.set_boolean('logging-on-off-toggle', widget.get_active());
            });

            toggleLoggingRow.add_suffix(toggleLoggingSwitch);
            generalGroup.add(toggleLoggingRow);

            // 
            // Allow a custom colour choice for group icons
            // 

            let colourGroupIconButton = new Gtk.ColorButton();
            let groupIconColour = new Gdk.RGBA();

            let colourGroupIconButtonRow = new Adw.ActionRow({
                title: _("Custom Group Icon Colour"),
                subtitle: _("Customise the colour representing the fill for the group icons"),
                activatable_widget: colourGroupIconButton
            });

            let customGroupIconRGBColour = this._settings.get_string('custom-group-icon-colour');

            groupIconColour.parse(customGroupIconRGBColour);
            colourGroupIconButton.set_rgba(groupIconColour);

            colourGroupIconButton.connect('color-set', (widget) =>
            {
                let rgb = widget.get_rgba();
                this._settings.set_string('custom-group-icon-colour', rgb.to_string());
            });

            colourGroupIconButtonRow.add_suffix(colourGroupIconButton);
            generalGroup.add(colourGroupIconButtonRow);

            // 
            // Allow a custom colour choice for menu text labels
            // 

            let colourTextButton = new Gtk.ColorButton();
            let menuTextColour = new Gdk.RGBA();

            let colourTextButtonRow = new Adw.ActionRow({
                title: _("Custom Menu Text Colour"),
                subtitle: _("Customise the colour representing the fill for the menu labels"),
                activatable_widget: colourTextButton
            });

            let customLabelTextRGBColour = this._settings.get_string('custom-menu-label-text-colour');

            menuTextColour.parse(customLabelTextRGBColour);
            colourTextButton.set_rgba(menuTextColour);

            colourTextButton.connect('color-set', (widget) =>
            {
                let rgb = widget.get_rgba();
                this._settings.set_string('custom-menu-label-text-colour', rgb.to_string());
            });

            colourTextButtonRow.add_suffix(colourTextButton);
            generalGroup.add(colourTextButtonRow);

            this.add(generalGroup);

            //
            // Display some info about the environemnt which may help any troubleshooting
            //

            let environmentGroup = new Adw.PreferencesGroup({ title: _("Environment") });

            let releaseVersion = (Me.metadata.version) ? Me.metadata.version : _("unknown");
            let gitVersion = (Me.metadata['git-version']) ? Me.metadata['git-version'] : null;
            let windowingLabel = (Me.metadata.isWayland) ? "Wayland" : "X11";

            // Extension version
            let evpnassistantVersionRow = new Adw.ActionRow({ title: _("EVPN Assistant Version") });
            evpnassistantVersionRow.add_suffix(new Gtk.Label({ label: releaseVersion + '' }));
            environmentGroup.add(evpnassistantVersionRow);

            // Git version for self builds
            let gitVersionRow = null;
            if (gitVersion)
            {
                gitVersionRow = new Adw.ActionRow({ title: _("Git Version") });
                gitVersionRow.add_suffix(new Gtk.Label({ label: gitVersion + '' }));
            }
            gitVersion && environmentGroup.add(gitVersionRow);

            // Which version is being used
            let gnomeVersionRow = new Adw.ActionRow({ title: _("GNOME Version") });
            gnomeVersionRow.add_suffix(new Gtk.Label({ label: imports.misc.config.PACKAGE_VERSION + '', }));
            environmentGroup.add(gnomeVersionRow);

            // session type
            let sessionTypeRow = new Adw.ActionRow({ title: _("Session Type"), });
            sessionTypeRow.add_suffix(new Gtk.Label({ label: windowingLabel }));
            environmentGroup.add(sessionTypeRow);

            this.add(environmentGroup);

            //
            // Donations and reference to GitHub
            //

            let imageGroup = new Adw.PreferencesGroup();

            let pixbuf = GdkPixbuf.Pixbuf.new_from_file(Me.path + '/media/icons/donate.svg');
            let donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
            let donateButton = new Gtk.LinkButton({
                child: donateImage,
                uri: 'https://www.paypal.com/donate/?hosted_button_id=N8R7KYHP7KQEQ'
            });

            pixbuf = GdkPixbuf.Pixbuf.new_from_file(Me.path + '/media/icons/github.svg');
            let githubImage = Gtk.Picture.new_for_pixbuf(pixbuf);
            let githubButton = new Gtk.LinkButton({
                child: githubImage,
                uri: Me.metadata.url,
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.CENTER
            });

            let imagesBox = new Adw.ActionRow();

            imagesBox.add_prefix(donateButton);
            imagesBox.add_suffix(githubButton);

            imageGroup.add(imagesBox);

            this.add(imageGroup);
        }
    });