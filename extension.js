'use strict';

//
// extension evpn-assistant - extension.js
// JavaScript Gnome extension for ExpressVPN Shell Control.
// 
// @author    : Stuart J Gilmour
// @copyright : Copyright 2022, Stuart J Gilmour.
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

const GETTEXT_DOMAIN = 'evpn-assistant';

const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EvpnAssistantMenu = Me.imports.extensionmenu;
const Main = imports.ui.main;

const _ = ExtensionUtils.gettext;

var evpnAssistantMenu;

// EvpnAssistant - controlling class for the applet
//
// Expected log sequence:
//
// Initialising ExpressVPN Shell Assistant version: 1.0.0
// EvpnAssistant Constructor
// Enabling ExpressVPN Shell Assistant version 1.0.0
class EvpnAssistant
{
    // The object is created in the init function and thus the constructor is called.
    constructor(uuid)
    {
        log("EvpnAssistant Constructor");

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
        this._uuid = uuid;
    }

    // enable is called after the extension is loaded. 
    enable()
    {
        log(`Enabling ${Me.metadata.name} version ${Me.metadata.version}`);

        evpnAssistantMenu = new EvpnAssistantMenu.EvpnAssistMenu();
    }

    disable()
    {
        evpnAssistantMenu.StopVpnStatusPolling();
        evpnAssistantMenu.disconnectSignals(true);
        evpnAssistantMenu.destroy();
        evpnAssistantMenu = null;

        log(`Disabling ${Me.metadata.name} version ${Me.metadata.version}`);
    }
}

// This function is called first when the extension is loaded
function init(meta)
{
    log(`Initialising ${Me.metadata.name} version: ${Me.metadata.version}`);

    return new EvpnAssistant(meta.uuid);
}
