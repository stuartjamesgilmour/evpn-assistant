'use strict';

//
//  extension evpn-assistant - extensionmenu.js
//  JavaScript Gnome extension for ExpressVPN Shell Control.
//
//  @author    : Stuart J Gilmour
//  @copyright : Copyright 2022, Stuart J Gilmour.

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
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const EvpnAssistPanelMenu = Me.imports.evpnpanelmenu;
const Utils = Me.imports.utils;
const EVpn = Me.imports.evpntoolkit;
const ByteArray = imports.byteArray;
const Main = imports.ui.main;

const _ = ExtensionUtils.gettext;

//
// EvpnAssistMenu class. Provides widget with menu items.
//
// @class EvpnAssistMenu
// @constructor
// @return {Object} menu widget instance
//
var EvpnAssistMenu = GObject.registerClass(
     {
          GTypeName: 'EvpnAssistMenu'
     },
     class EvpnAssistMenu extends EvpnAssistPanelMenu.EvpnAssistPanelMenu
     {
          //
          // EvpnAssistMenu class initialization
          //
          // @method _init
          //
          _init()
          {
               // Call the base class to do its initialisation
               super._init({ iconFile: Me.dir.get_path() + '/media/icons/evpnnotconnected.svg' });

               // Dictionary of signals
               this._signals = {};

               // Create a helper for handling communications with express VPN process
               this.assistVpn = new EVpn.AssistantToolkit();

               // Setup reading of settings
               this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);

               // Settings changed, so stop/start polling and rebuild menu using new settings
               let signal = this._settings.connect("changed", () =>
               {
                    Utils.logDebug("Settings Changed");

                    // Stop the current polling
                    this.StopVpnStatusPolling();

                    // Load the settings
                    this.loadSettings();

                    // Only poll if the preferences are set to true
                    if (this._pollingOnOff)
                    {
                         // and then restart it with the new settings
                         this.pollHandle = this.StartVpnStatusPolling();
                    }
               });
               this.appendSignal(signal, this._settings, false);

               // Rebuild on open. This is useful when adding new json menu items. All that needs
               // to change is the actual menu.json, save a flag for the icon and and then re-open
               // the menu and changes should be reflected without a restart of gnome-shell
               this._openMenuDefault = null;
               signal = this.menu.connect("open-state-changed", () =>
               {
                    Utils.logDebug("open-state-changed");

                    if (this.menu.isOpen)
                    {
                         // Build the eVPN assistant menu panel
                         this.rebuildMenu();

                         if (this._openMenuDefault !== null)
                              this._openMenuDefault.open(false);
                    }
               });

               this.appendSignal(signal, this.menu, false);

               this._startingUpSignal = undefined;
               if (Main.layoutManager._startingUp)
               {
                    this._startingUpSignal = Main.layoutManager.connect(
                         "startup-complete",
                         () =>
                         {
                              Utils.logDebug("Startup now complete");

                              Main.layoutManager.disconnect(this._startingUpSignal);
                              this._startingUpSignal = undefined;

                              // Build the eVPN assistant menu panel
                              this.rebuildMenu();

                              // Load the settings
                              this.loadSettings();

                              // Only poll if the preferences are set to true
                              if (this._pollingOnOff)
                              {
                                   // Kick off the polling process
                                   this.pollHandle = this.StartVpnStatusPolling();
                              }
                         }
                    );
               }
               else
               {
                    Utils.logDebug("Starting up normally");

                    // Build the eVPN assistant menu panel
                    this.rebuildMenu();

                    // Load the settings
                    this.loadSettings();

                    // Only poll if the preferences are set to true
                    if (this._pollingOnOff)
                    {
                         // Kick off the polling process
                         this.pollHandle = this.StartVpnStatusPolling();
                    }

                    this.setPositionInPanel();
               }
          }

          _buildMenuFromFile()
          {
               Utils.logDebug("Creating menu from JSON file");

               let icon;
               let signal;

               let menuItems = [];
               let groupIcon

               let fullFilenameAndPath = Me.dir.get_path() + "/menustructure/menus.json";
               let [ok, contents] = GLib.file_get_contents(fullFilenameAndPath);

               if (ok)
               {
                    let x = ByteArray.toString(contents);
                    let map = JSON.parse(x);

                    // Identify the menu item(s) JSON array
                    var menuArray = map["menuitems"];

                    // For each menu json object in the menu array
                    for (let i = 0; i < menuArray.length; i++)
                    {
                         let groupsArray = menuArray[i];

                         // This skips trying to read an empty set of items and add the seperator
                         if (groupsArray.groupLabel.includes("seperator"))
                         {
                              menuItems.push(new PopupMenu.PopupSeparatorMenuItem());
                              continue;
                         }

                         // If the group label is NOT empty, then this is defined as a group
                         if (!Utils.isEmpty(groupsArray.groupLabel))
                         {
                              let popupMenuGroupExpander = new PopupMenu.PopupSubMenuMenuItem(_(groupsArray.groupLabel));

                              if (!Utils.isEmpty(groupsArray.groupIconPath))
                                   groupIcon = super._getIconByPath(Me.dir.get_path() + groupsArray.groupIconPath);

                              if (groupIcon !== null)
                                   popupMenuGroupExpander.insert_child_at_index(groupIcon, 0);

                              let labelText = popupMenuGroupExpander.label
                              popupMenuGroupExpander.remove_child(popupMenuGroupExpander.label);

                              if (this._customMenuItemHexCodeColour === undefined)
                                   this._customMenuItemHexCodeColour = '#e95420';

                              labelText.clutter_text.set_markup((` <span fgcolor="${this._customMenuItemHexCodeColour}">${labelText.text}</span>`));

                              let itemBox = new St.BoxLayout();
                              itemBox.horizontal = true;
                              itemBox.add(labelText);

                              popupMenuGroupExpander.insert_child_at_index(itemBox, 1);

                              // Identify the menu items JSON away
                              var itemArray = groupsArray["items"];

                              // For each object item in the items array
                              for (let idx = 0; idx < itemArray.length; ++idx)
                                   this._processSubMenuItems(itemArray, idx, signal, popupMenuGroupExpander);

                              menuItems.push(popupMenuGroupExpander);
                         }
                         else
                         {
                              // Identify the menu items JSON away
                              var itemArray = groupsArray["items"];
                              let item = itemArray[0];

                              let menuItem = new PopupMenu.PopupMenuItem(_(item.itemLabel));

                              icon = super._getFlagIconByPath(Me.dir.get_path() + item.itemIconPath);

                              if (icon !== null)
                                   menuItem.insert_child_at_index(icon, 0);

                              this._connectSignalToMenuItem(signal, menuItem, item);

                              menuItems.push(menuItem);
                         }
                    }
               }
               else
               {
                    logDebug("Unable to read the menustructure.json file.")
               }

               return menuItems;
          }

          //
          // _processSubMenuItems - Processes json array of entries under a group
          //

          _processSubMenuItems(itemArray, idx, signal, popupMenuGroupExpander)
          {
               let obj = itemArray[idx];

               let submenu = new PopupMenu.PopupMenuItem(obj.itemLabel);
               let itemIcon = super._getFlagIconByPath(Me.dir.get_path() + obj.itemIconPath);

               if (itemIcon !== null)
                    submenu.insert_child_at_index(itemIcon, 0);

               let labelText = submenu.label;
               submenu.remove_child(submenu.label);

               if (this._customMenuItemHexCodeColour === undefined)
                    this._customMenuItemHexCodeColour = '#e95420';

               labelText.clutter_text.set_markup((` <span fgcolor="${this._customMenuItemHexCodeColour}">${labelText.text}</span>`));

               let itemBoxTwo = new St.BoxLayout();
               itemBoxTwo.horizontal = true;
               itemBoxTwo.add(labelText);

               submenu.insert_child_at_index(itemBoxTwo, 1);

               this._connectSignalToMenuItem(signal, submenu, obj);

               popupMenuGroupExpander.menu.addMenuItem(submenu);

               return signal;
          }

          //
          // _connectSignalToMenuItem - wire up the menu action based on the 'item' specified parameters
          //

          _connectSignalToMenuItem(signal, menuItem, item)
          {
               signal = menuItem.connect(
                    'button-press-event',
                    async () =>
                    {
                         var vpnDest = item.itemVpnCode;
                         var vpnStatus = Symbol.for("Unknown");

                         // Connect to specified VPN destination
                         vpnStatus = await this._performConnectMenuAction(vpnStatus, vpnDest);

                         // Process the tray icon status
                         super.UpdateVpnIconStatus(vpnStatus);
                    }
               );

               this.appendSignal(signal, menuItem, true);

               return signal;
          }

          //
          // Build the extension menu
          //
          // @method rebuildMenu
          //
          rebuildMenu()
          {
               // Important to call the base class to clear the menu and start a fresh
               super.rebuildMenu();

               Utils.logDebug("Rebuilding Evpn assistant panel menu.");

               for (let menuItem of this._buildMenuFromFile())
                    this.menu.addMenuItem(menuItem);

               // Include additional menu items such as the disconnect and settings
               for (let additionalMenuItem of this._createAdditionalMenuItems())
                    this.menu.addMenuItem(additionalMenuItem);
          }

          //
          // Creates the disconnect and settings menu items
          //
          // @method _createAdditionalMenuItems
          // @private
          // @return {Object} array of menu items
          //
          _createAdditionalMenuItems()
          {
               Utils.logDebug("Creating VPN location menu items.");

               let icon;
               let items = [];
               let signal;

               // Add a popup menu separator
               items = items.concat([new PopupMenu.PopupSeparatorMenuItem()]);

               // Settings menu item
               let settingsVpnItem = new PopupMenu.PopupMenuItem(_("Settings"));

               icon = super._getIconByPath(Me.dir.get_path() + "/media/icons/settings.svg");

               if (icon !== null)
                    settingsVpnItem.insert_child_at_index(icon, 0);

               let settingsLabel = settingsVpnItem.label;
               settingsVpnItem.remove_child(settingsVpnItem.label);

               if (this._customMenuItemHexCodeColour === undefined)
                    this._customMenuItemHexCodeColour = '#e95420';

               settingsLabel.clutter_text.set_markup((` <span fgcolor="${this._customMenuItemHexCodeColour}">${settingsLabel.text}</span>`));

               let settingsItemBox = new St.BoxLayout();
               settingsItemBox.horizontal = true;
               settingsItemBox.add(settingsLabel);

               settingsVpnItem.insert_child_at_index(settingsItemBox, 1);

               signal = settingsVpnItem.connect(
                    'button-press-event',
                    async () =>
                    {
                         try
                         {
                              Utils.logDebug("Calling settings menu");
                              this.menu.close();
                              this._performSettingsMenuAction();
                         }
                         catch (error)
                         {
                              Utils.logError("Error calling prefs window: " + error);
                         }

                    }
               );

               this.appendSignal(signal, settingsVpnItem, true);
               items.push(settingsVpnItem);

               //
               // Disconnect menu item
               //

               let disconnectVpnItem = new PopupMenu.PopupMenuItem(_("Disconnect"));

               icon = super._getIconByPath(Me.dir.get_path() + "/media/icons/disconnect-plug-icon.svg");

               if (icon !== null)
                    disconnectVpnItem.insert_child_at_index(icon, 0);

               let disconnectLabel = disconnectVpnItem.label;
               disconnectVpnItem.remove_child(disconnectVpnItem.label);

               if (this._customMenuItemHexCodeColour === undefined)
                    this._customMenuItemHexCodeColour = '#e95420';

               disconnectLabel.clutter_text.set_markup((` <span fgcolor="${this._customMenuItemHexCodeColour}">${disconnectLabel.text}</span>`));

               let disconnectItemBox = new St.BoxLayout();
               disconnectItemBox.horizontal = true;
               disconnectItemBox.add(disconnectLabel);

               disconnectVpnItem.insert_child_at_index(disconnectItemBox, 1);

               signal = disconnectVpnItem.connect(
                    'button-press-event',
                    async () =>
                    {
                         let vpnStatus = await this._performDisconnectMenuAction();

                         // Process the tray icon state
                         super.UpdateVpnIconStatus(vpnStatus);
                    }
               );

               this.appendSignal(signal, disconnectVpnItem, true);
               items.push(disconnectVpnItem);

               return items;
          }

          //
          // @method _performConnectMenuAction
          // @Private
          //
          // @param {Symbol} - vpnStatus - The current status of the VPN connection, starting off as Unknown
          // @param {String} - vpnDest   - The VPN destination we're hoping to connect to.
          //
          async _performConnectMenuAction(vpnStatus, vpnDest)
          {
               try
               {
                    vpnStatus = await this.assistVpn.EVpnCommandStatus();
                    Utils.logDebug("VPN status returned: " + Symbol.keyFor(vpnStatus).toString());

                    if (Symbol.keyFor(vpnStatus).toString() === "Connected")
                    {
                         Utils.logDebug("Attempting reconnect...");

                         let vpnStatus = await this._performDisconnectMenuAction();

                         vpnStatus = await this.assistVpn.EVpnCommandConnect(vpnDest);
                         Utils.logDebug("VPN connect returned: " + Symbol.keyFor(vpnStatus).toString());
                    }

                    if (Symbol.keyFor(vpnStatus).toString() === "NotConnected")
                    {
                         vpnStatus = await this.assistVpn.EVpnCommandConnect(vpnDest);
                         Utils.logDebug("VPN connect returned: " + Symbol.keyFor(vpnStatus).toString());
                    }

                    if (Symbol.keyFor(vpnStatus).toString() === "Pending")
                    {
                         // Most likely we're transitioning VPN state, so check status once more.
                         vpnStatus = await this.assistVpn.EVpnCommandStatus();
                         Utils.logDebug("VPN status returned: " + Symbol.keyFor(vpnStatus).toString());
                    }
               }
               catch (e)
               {
                    logError("Failed to obtain VPN status");
               }

               return vpnStatus;
          }

          //
          // @method _performDisconnectMenuAction
          // @Private
          //
          async _performDisconnectMenuAction()
          {
               let vpnStatus = Symbol.for("Unknown");

               try
               {
                    // Find out the initial VPN status
                    vpnStatus = await this.assistVpn.EVpnCommandStatus();

                    // If connected, then perform the disconnect
                    if (Symbol.keyFor(vpnStatus).toString() === "Connected")
                         vpnStatus = await this.assistVpn.EVpnCommandDisconnect();

                    // The VPN state is transitioning, so poll status once more
                    if (Symbol.keyFor(vpnStatus).toString() === "Pending")
                         vpnStatus = await this.assistVpn.EVpnCommandStatus();

                    if (Symbol.keyFor(vpnStatus).toString() === "Disconnected" || Symbol.keyFor(vpnStatus).toString() === "Disconnecting")
                         vpnStatus = await this.assistVpn.EVpnCommandStatus();
               }
               catch (error)
               {
                    // If an error occurred log the stacktrace.
                    Utils.logError("Failed to obtain VPN status: " + error);
               }

               return vpnStatus;
          }

          //
          // Opens up the prefereneces menu
          //

          _performSettingsMenuAction()
          {
               this.menu.close();
               ExtensionUtils.openPrefs();
               return 0;
          }

          //
          // Load configured settings
          //

          loadSettings()
          {
               Utils.logDebug("Loading settings");

               this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);

               this._pollingInterval = this._settings.get_int('polling-interval');
               this._indicatorPosition = this._settings.get_enum('position-in-panel');
               this._pollingOnOff = this._settings.get_boolean('polling-on-off-toggle');
               this._loggingOnOff = this._settings.get_boolean('logging-on-off-toggle');

               Utils.kDebug = Utils.kInfo = Utils.kTrace = this._loggingOnOff;

               //
               // Convert the the custom group icon colour from a string representation of RGB to a hex code
               //

               let rgbStr = this._settings.get_string('custom-group-icon-colour');

               // Trim either side to just the numbers and commas and then tokenise on the comma
               let sa = rgbStr.slice(4, rgbStr.length - 1).split(',');
               Utils.logTrace("RGB Array Items: " + sa[0] + "," + sa[1] + "," + sa[2]);

               // Parse each string token to an int value and pass as arguments to the conversion function
               this._customHexCodeColour = Utils.rgbToHex(parseInt(sa[0], 10), parseInt(sa[1], 10), parseInt(sa[2], 10));
               Utils.logTrace(this._customHexCodeColour);

               //
               // Convert the the custom menu item text colour from a string representation of RGB to a hex code
               //

               let rgbLabelStr = this._settings.get_string('custom-menu-label-text-colour');

               // Trim either side to just the numbers and commas and then tokenise on the comma
               let sarray = rgbLabelStr.slice(4, rgbLabelStr.length - 1).split(',');
               Utils.logTrace("RGB Array Items: " + sarray[0] + "," + sarray[1] + "," + sarray[2]);

               // Parse each string token to an int value and pass as arguments to the conversion function
               this._customMenuItemHexCodeColour = Utils.rgbToHex(parseInt(sarray[0], 10), parseInt(sarray[1], 10), parseInt(sarray[2], 10));
               Utils.logTrace(this._customMenuItemHexCodeColour);

               //
               // Update the extension location in the panel
               //

               this.setPositionInPanel();
          }

          //
          // Polling the VPN status and supporting functions
          //

          async StartVpnStatusPolling()
          {
               Utils.logDebug("StartVpnStatusPolling()");

               try
               {
                    // Create a polling mechanism
                    await this.PollStatus();
               }
               catch (error)
               {
                    Utils.logError("An error occurred trying to start the VPN polling status: " + error);
               }
          }

          async StopVpnStatusPolling()
          {
               Utils.logDebug("StopVpnStatusPolling()");

               try
               {
                    clearTimeout(this.pollHandle);
               }
               catch (error)
               {
                    Utils.logError("An error occurred trying to stop the VPN polling status: " + error);
               }
          }

          async PollStatus()
          {
               Utils.logNewline();
               Utils.logDebug("Polling VPN Status: " + new Date().toISOString());

               let vpnStatus = Symbol.for("Unknown");

               try
               {
                    vpnStatus = await this.assistVpn.EVpnCommandStatus();

                    if (Symbol.keyFor(vpnStatus).toString() === "NotConnected")
                         Utils.logDebug("*** NOT CONNECTED ***");

                    if (Symbol.keyFor(vpnStatus).toString() === "Connected")
                         Utils.logDebug("*** CONNECTED ***");

                    // The VPN state is transitioning, so poll status once more
                    if (Symbol.keyFor(vpnStatus).toString() === "Pending")
                         Utils.logDebug("*** PENDING ***");

                    if (Symbol.keyFor(vpnStatus).toString() === "Disconnected" || Symbol.keyFor(vpnStatus).toString() === "Disconnecting")
                         Utils.logDebug("*** NEGOTIATING ***");

                    // Uodates the shell tray icon
                    super.UpdateVpnIconStatus(vpnStatus);

                    // Calls this function again at a specifed poll interval
                    var t = this;
                    this.pollHandle = setTimeout(function () { t.PollStatus() }, this._pollingInterval * 1000);
                    Utils.logDebug(`Polling set to: ${this._pollingInterval} seconds.`);
               }
               catch (error)
               {
                    Utils.logError("Error Received: " + error);
               }
          };
     });