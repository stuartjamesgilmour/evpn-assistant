# evpn-assistant
![screenshot](https://github.com/stuartjamesgilmour/evpn-assistant/blob/main/evpn-assistant-screenshot.png)

## Gnome Shell Extension
evpn-assistant is a Gnome Shell extension which allows ExpressVPN to be controlled through the GNOME shell. This extension is not affiliated with ExpressVPN but does requires a valid subscription and the expressVPN binary to be installed and activated. More can be found on the companies website: https://www.expressvpn.com/vpn-software

This extension groups together VPN locations into various menu and submenu items. The group locations expand presenting the countries flag and clicking on the menu item
will attempt to connect you to the destination. Polling of the VPN status can be set between 10 seconds and 10 mins which will check the current VPN connection and update
the main status tray icon to reflect connectivity. Polling can be turned off if there is no interest in syncing the current VPN status. Polling is generally useful if the connection drops unexpectedly or another client is used to change the VPN status, such as the command line or a browser extension. Menu labels and group icons can be customised to whatever colour best fits the ubuntu theme being used.

## Running Environment
This extension has been written on Ubuntu 22.04 using Clutter Shell Toolkit and GTK. 

Package: gir1.2-clutter-1.0
Package: gettext

GTK
API Version: 3.0
Library Version: 3.24

## Check dependencies
sudo dpkg -s gir1.2-clutter-1.0
sudo dpkg -s gettext
gtk-launch --version

## Some useful ExpressVPN commands which can be made via the terminal

Note: Requires expressvpn ( https://www.expressvpn.com/vpn-software )

To activate ExpressVPN account:
   expressvpn activate

To connect to smart location or last connected location:
   expressvpn connect

To connect to a country:
   expressvpn connect "Germany"

To connect to a specific location:
   expressvpn connect "Germany - Frankfurt - 1"

To check current connection status:
   expressvpn status

To list all available connections:
   expressvpn list all

To disable Network Lock:
   expressvpn preferences set network_lock off

To enable Threat Manager:
   expressvpn preferences set block_trackers true

## Troubleshooting
 1. If you are experiencing issues, try to log out and log in again or restarting the restart GNOME Shell (XOrg: Alt+F2, r, Enter - 
    Wayland: log out or reboot) and enable the extension through the gnome-extensions manager.
 2. If your troubles persist try resetting settings.
    * You can call: `dconf reset -f /org/gnome/shell/extensions/evpn-assistant/` or use `dconf-editor`.
 3. If you are still having a persistent problem, then please file an issue on GitHub. To assist with the problem, please turn on logging in the
    preferences and provide as much detail as possible, including settings, log extracts and exceptions.
    * You can obtain the logfile like this: `journalctl -f /usr/bin/gnome-shell 2>&1 | grep -i Evpn > evpn-assistant.log`.
    * Run the application to ensure that 

## Personal Note
This extension was written for personal usage and designed to fill the gap in providing seamless Gnome Shell integration. The extension has been
made freely available for others to enjoy and I am not in any way affiliated with ExpressVPN. The extension is provided as is with absolutely no
warranty.

## Acknowledgements
Some UI elements came from these repositories:
https://github.com/Ileriayo/markdown-badges
https://github.com/aha999/DonateButtons

## Supported Gnome Shell version
This extension was written to supports Gnome Shell version 42, 42.4 and will most likely work for 43. This is correct as of the 02/10/2022.

## Installation from e.g.o
https://extensions.gnome.org/extension/5385/evpn-shell-assistant/

## Manual installation

 1. `git clone https://github.com/stuartjamesgilmour/evpn-assistant.git`
 2. `cd evpn-assistant`
 3. `./release.sh`
 4. `gnome-extensions install evpn-assistant@xytrexl.com.zip`
 5. Logout and then Login again
 6. `gnome-extensions enable evpn-assistant@xytrexl.com`

 ## If you would like to help support my work
 https://www.paypal.com/donate/?hosted_button_id=N8R7KYHP7KQEQ

 ![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)
