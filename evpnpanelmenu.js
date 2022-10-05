'use strict';

//
//  extension evpn-assistant - evpnpanelmenu.js
//  JavaScript Gnome extension for ExpressVPN Shell Control.
//
//  @author Stuart J Gilmour
//  @copyright Copyright 2022, Stuart J Gilmour.
//

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

const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const cairo = imports.cairo;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PanelMenu = imports.ui.panelMenu;
const Main = imports.ui.main;

const IconSizeX = 28;
const IconSizeY = 28;

const EvpnAssistantMenuPosition = { CENTER: 0, RIGHT: 1, LEFT: 2 };

// 
// EvpnAssistPanelMenu class. Provides widget with menu items.
// 
// @class EvpnAssistPanelMenu
// @constructor
// @return {Object} menu widget instance
// 
var EvpnAssistPanelMenu = GObject.registerClass(
    {
        GTypeName: 'EvpnAssistPanelMenu',
        Properties:
        {
            "iconFile": GObject.ParamSpec.string("iconFile", "iconFile", "iconFile", GObject.ParamFlags.READWRITE, null),
        },
    },
    class EvpnAssistPanelMenu extends PanelMenu.Button 
    {
        _init(params) 
        {
            // Polling defaults to every 10 seconds
            this._pollingInterval = 60;
            this._pollHandle = -1;
            this._indicatorPosition = EvpnAssistantMenuPosition.CENTER;
            this._indicatorPositionBackUp = -1;

            super._init(0.0, Me.metadata.name, false);
            this._icon = new St.Icon({ style_class: 'system-status-icon' });
            this._icon.gicon = Gio.icon_new_for_string(params.iconFile), this.add_actor(this._icon);

            this.setPositionInPanel();
        }

        // 
        // Read icon from file store and return icon.
        // 
        // @method _getIconByPath
        //
        // @protected
        // @param {String} path to icon
        // @return {Object} icon or null if not found
        // 
        _getFlagIconByPath(iconPath)
        {
            let icon = null;

            try
            {
                let file = Gio.file_new_for_path(iconPath);
                let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                icon = St.TextureCache.get_default().load_file_async(file, 42, 28, scaleFactor, scaleFactor);
            }
            catch (e)
            {
                logError(e, `Couldn't find icon: ${iconPath}`);
                return null;
            }

            return icon;
        }

        // 
        // Read icon from file store and return icon.
        // 
        // @method _getIconByPath
        //
        // @protected
        // @param {String} path to icon
        // @return {Object} icon or null if not found
        // 
        _getIconByPath(iconPath)
        {
            let icon = null;
            let themeContext = St.ThemeContext.get_for_stage(global.stage);

            try
            {
                icon = new St.Icon({ gicon: Gio.icon_new_for_string(iconPath), style_class: 'system-status-icon' });
                icon.set_size(IconSizeX * themeContext.scaleFactor, IconSizeY * themeContext.scaleFactor);

                let shaders = this._updateIconColourEffect(this._customHexCodeColour);
                icon.add_effect(shaders);
            }
            catch (e)
            {
                logError(e, `Couldn't find icon or apply icon effect: ${iconPath}`);
                return null;
            }

            return icon;
        }

        //
        // @method UpdateVpnIconStatus
        // 
        // @description - State machine to update the icon based on status
        // @param {Object} array of menu items
        //
        UpdateVpnIconStatus(vpnStatus)
        {
            if (vpnStatus === Symbol.for("NotConnected"))
            {
                this._setIconToNotConnected();
            }
            else if (vpnStatus === Symbol.for("Pending"))
            {
                this._setIconToPending();
            }
            else if (vpnStatus === Symbol.for("Connected"))
            {
                this._setIconToConnected();
            }
        }

        //
        // Update the main button icon to the connected state
        //

        _setIconToConnected() 
        {
            this._icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/media/icons/evpnconnected.svg');
        }

        //
        // Update the main button icon to the NOT connected state
        //

        _setIconToNotConnected() 
        {
            this._icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/media/icons/evpnnotconnected.svg');
        }

        //
        // Update the main button icon to the pending state
        //

        _setIconToPending() 
        {
            this._icon.gicon = Gio.icon_new_for_string(Me.dir.get_path() + '/media/icons/evpnpending.svg');
        }

        //
        // rebuild the menu - base handles the disconnect all signals and destroy
        //

        rebuildMenu()
        {
            this.disconnectSignals(false);

            let items = this.menu._getMenuItems();
            for (let i in items)
                items[i].destroy();
        }

        //
        // Append signal to dictionary
        //
        // @method _appendSignal
        // @private
        // @param {Number} signal number
        // @param {Object} object signal is connected
        //
        appendSignal(signal, object, rebuild)
        {
            //Utils.logTrace(`Adding signal: ${signal}`);
            this._signals[signal] = { "object": object, "rebuild": rebuild };
        }

        //
        // Disconnect signals
        //
        // @method disconnectSignals
        //
        disconnectSignals(clearAll)
        {
            let clearSigs = "rebuild";

            for (let id in this._signals)
            {
                if (this._signals[id][clearSigs] || clearAll)
                {
                    try
                    {
                        //Utils.logTrace(`Deleting signal: ${id}`);
                        this._signals[id]["object"].disconnect(id);
                        delete (this._signals[id]);
                    }
                    catch (error)
                    {
                        Utils.logError(error, `Unable to perform signal disconnect.`);
                        continue;
                    }
                }
            }
        }

        // 
        // Check and change indicator position in menu.
        // 
        // @method setPositionInPanel
        // 
        setPositionInPanel()
        {
            let children = null;

            if (this._indicatorPositionBackUp === this._indicatorPosition)
                return;

            this.get_parent().remove_actor(this);

            switch (this._indicatorPosition)
            {
                case EvpnAssistantMenuPosition.LEFT:
                    {
                        children = Main.panel._leftBox.get_children();
                        Main.panel._leftBox.insert_child_at_index(this, children.length);
                        break;
                    }

                case EvpnAssistantMenuPosition.CENTER:
                    {
                        children = Main.panel._centerBox.get_children();
                        Main.panel._centerBox.insert_child_at_index(this, children.length);
                        break;
                    }

                case EvpnAssistantMenuPosition.RIGHT:
                    {
                        children = Main.panel._rightBox.get_children();
                        Main.panel._rightBox.insert_child_at_index(this, 0);
                        break;
                    }

                default:
                    {
                        children = Main.panel._rightBox.get_children();
                        Main.panel._rightBox.insert_child_at_index(this, 0);
                    }
            }

            this._indicatorPositionBackUp = this._indicatorPosition;
        }

        // 
        // Allow icons to be given a custom colour
        //
        // Useful site:
        // https://www.color-hex.com/color/e37933
        //
        // @method _updateIconColourEffect
        // @private
        // @param {string} hexcode for a given colour
        // @return {Object} effect
        // 
        _updateIconColourEffect(hexColourCodeString)
        {
            if (hexColourCodeString === undefined)
                hexColourCodeString = '#e95420';

            let colourEffect = new Clutter.BrightnessContrastEffect();

            let colour = Clutter.Color.from_string(hexColourCodeString)[1];
            // Utils.logDebug(colour.to_string().slice(0, 7));

            colourEffect.brightness = colour;
            return colourEffect;
        }
    });
