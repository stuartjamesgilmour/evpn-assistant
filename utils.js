'use strict';

// 
// extension evpn-assistant - utils.js
// JavaScript Gnome extension for ExpressVPN Shell Control.
// 
// @author Stuart J Gilmour
// @copyright Copyright 2022, Stuart J Gilmour.
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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const EVpn = Me.imports.evpntoolkit;

var kDebug = true;
var kInfo = true;
var kTrace = true;

var EvpnState = Object.freeze({
    Unknown: Symbol("Unknown"),
    Pending: Symbol("Pending"),
    NotConnected: Symbol("NotConnected"),
    Connected: Symbol("Connected"),
    Disconnected: Symbol("Disconnected"),
    Disconnecting: Symbol("Disconnecting"),
    Connecting: Symbol("Connecting"),
    Reconnecting: Symbol("Reconnecting")
});

var CmdType = Object.freeze({
    cmdCheckVpnStatus: Symbol("CheckVpnStatus"),
    cmdConnect: Symbol("Connect"),
    cmdDisconnect: Symbol("Disconnect"),
});

//
// Is the string really empty
//
function isEmpty(str)
{
    return (str === undefined || str == null || str.length <= 0) ? true : false;
}

// 
// Logs debug message to journal
// 
// @method logDebug
// @param {string} debug output
// 
function logDebug(msg)
{
    if (kDebug)
    {
        log(`[Evpn Debug]: ${msg}`)
    }
}

// 
// Logs trace message to journal
// 
// @method logInfo
// @param {string} trace output
// 
function logTrace(msg)
{
    if (kTrace)
    {
        log(`[Evpn Trace]: ${msg}`)
    }
}

// 
// Logs info message to journal
// 
// @method logInfo
// @param {string} info output
// 
function logInfo(msg)
{
    if (kInfo)
    {
        log(`[Evpn Info]: ${msg}`)
    }
}

// 
// Logs error message to the journal
// 
// @method logError
// @param {String} error output
// 
function logError(msg)
{
    log(`[Evpn Error]: ${msg}`);
}

// 
// Logs newline to the journal
// 
// @method logNewline
// 
function logNewline()
{
    if (kInfo && kDebug && kTrace)
        log("");
}

//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
//
// I also like simple and this makes sense to me.
function hex2rgb(hex)
{
    return ['0x' + hex[1] + hex[2] | 0, '0x' + hex[3] + hex[4] | 0, '0x' + hex[5] + hex[6] | 0];
}

function hexToRGBA(hexcode, opacity)
{
    return 'rgba(' + (hex = hex.replace('#', '')).match(new RegExp('(.{' + hex.length / 3 + '})', 'g')).map(function (l) { return parseInt(hex.length % 2 ? l + l : l, 16) }).concat(isFinite(opacity) ? opacity : 1).join(',') + ')';
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb 
function rgbToHex(red, green, blue)
{
    const rgb = (red << 16) | (green << 8) | (blue << 0);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
}