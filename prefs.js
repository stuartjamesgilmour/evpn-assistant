'use strict';

//
// extension evpn-assistant - prefs.js
// JavaScript Gnome extension for ExpressVPN Shell Control.
//
// @author Stuart J Gilmour
// @copyright Copyright 2022, Stuart J Gilmour.
//
// Reference Materal:
// https://gjs.guide/extensions/development/preferences.html
// https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/index.html

//
// @license
// The MIT License (MIT)
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

const { Adw, Gio, Gtk, Gdk } = imports.gi;

const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Utils = Me.imports.utils;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

// Import preferences pages
const SettingsPrefs = Me.imports.preferences.settingsPage;

//
// @method init
//

function init()
{
    log(`initializing ${Me.metadata.name} Preferences`);
}

function fillPreferencesWindow(window)
{
    Utils.logDebug("Inside fillPreferencesWindow");

    let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    if (!iconTheme.get_search_path().includes(Me.path + "/media"))
    {
        iconTheme.add_search_path(Me.path + "/media");
    }

    const settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
    const settingsPage = new SettingsPrefs.SettingsPage(settings);

    let prefsWidth = settings.get_int('prefs-default-width');
    let prefsHeight = settings.get_int('prefs-default-height');

    window.set_default_size(prefsWidth, prefsHeight);
    window.set_search_enabled(true);
    window.add(settingsPage);

    window.connect('close-request', () =>
    {
        let currentWidth = window.default_width;
        let currentHeight = window.default_height;

        // Remember user window size adjustments.
        if (currentWidth != prefsWidth || currentHeight != prefsHeight)
        {
            settings.set_int('prefs-default-width', currentWidth);
            settings.set_int('prefs-default-height', currentHeight);
        }
        window.destroy();
    });
}