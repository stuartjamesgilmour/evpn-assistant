'use strict';

// 
// extension evpn-assistant - evpntoolkit.js
// JavaScript Gnome extension for ExpressVPN Shell Control.
// 
// @author Stuart J Gilmour
// @copyright Copyright 2022, Stuart J Gilmour.
// 
// Reference Materal:
// https://gjs.guide/guides/gio/subprocesses.html
// https://docs.gtk.org/glib/func.spawn_async_with_pipes.html

//
// @license
// The MIT License (MIT)
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
const Gio = imports.gi.Gio;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

// 
// AssistantToolkit
// 
// @class AssistantToolkit
// @constructor
// @return {Object} instance
// 
var AssistantToolkit = class AssistantToolkit 
{
     constructor() 
     {
          Utils.logInfo("AssistantToolkit Constructor");
     }

     //
     // Calls the expressvpn cli checking the connected state of the vpn connection
     // @method EVpnCommandStatus()
     // @return Symbol representing the vpn connection state
     //

     async EVpnCommandStatus()
     {
          let connectionState = Symbol.for("Unknown");

          var cmdArgs = ['/usr/bin/expressvpn', 'status'];

          var cmdType = Symbol.for("CheckVpnStatus");
          connectionState = await this._eVpnCommand(cmdArgs, cmdType);

          return connectionState;
     }

     //
     // Calls the expressvpn cli and connects to the chosen destination
     // @method EVpnCommandConnect()
     // @return Symbol representing the vpn connection state
     //

     async EVpnCommandConnect(vpnDest)
     {
          var cmdArgs = ['/usr/bin/expressvpn', 'connect'];
          cmdArgs.push(vpnDest);

          var cmdType = Symbol.for("Connect");

          let connectionState = Symbol.for("Unknown");
          connectionState = await this._eVpnCommand(cmdArgs, cmdType);
          return connectionState;
     }

     //
     // Calls the expressvpn cli and disconnects from the vpn
     // @method EVpnCommandDisconnect()
     // @return Symbol representing the vpn connection state
     //

     async EVpnCommandDisconnect()
     {
          var cmdArgs = ['/usr/bin/expressvpn', 'disconnect'];

          var cmdType = Symbol.for("Disconnect");

          let connectionState = Symbol.for("Unknown");
          connectionState = await this._eVpnCommand(cmdArgs, cmdType);
          return connectionState;
     }

     // 
     // @method _eVpnCommand
     // @description Generic method to execute cmds using a subprocess and process the results 
     //              on stdout
     // @private 
     // @param cmdArgs - array of strings representing the cmd to be executed
     // @param cmdType - Symbol to define the kind of cmd being executed.
     // 

     async _eVpnCommand(cmdArgs, cmdType)
     {
          Utils.logDebug("Executing cmd: " + cmdArgs.join(" ") + ". Cmd type: " + Symbol.keyFor(cmdType).toString());

          const [res, pid, stdin, stdout, stderr] =
               GLib.spawn_async_with_pipes(null, cmdArgs, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
          GLib.close(stdin);

          Utils.logDebug("Pid for cmd " + cmdArgs.join(" ") + ": " + pid);

          // Get stdout stream
          let stdoutStream = new Gio.DataInputStream(
               {
                    base_stream: new Gio.UnixInputStream({ fd: stdout, close_fd: true }),
                    close_base_stream: true
               });

          // Perform the reading of stdout async
          let stdoutLines = [];
          this._readOutputAsync(stdoutStream, stdoutLines);

          // Get stderr stream
          let stderrStream = new Gio.DataInputStream(
               {
                    base_stream: new Gio.UnixInputStream({ fd: stderr, close_fd: true }),
                    close_base_stream: true
               });

          // Perform the reading of stderr async
          let stderrLines = [];
          this._readOutputAsync(stderrStream, stderrLines);

          var connectionState = Symbol.for("Unknown");

          try
          {
               // Setup a watch on the child process and wait for completion
               await this._waitOnSubProcessToComplete(cmdArgs, pid, stdoutLines, stdoutStream, stderrStream);

               // Process the VPN status check results from stdout, if the cmdType is for a 'CheckVpnStatus'
               //if (Symbol.keyFor(cmdType).toString() === "CheckVpnStatus" || Symbol.keyFor(cmdType).toString() === "Connect")
               connectionState = await this._processVpnStatus(stdoutLines);
          }
          catch (e)
          {
               // If an error occurred, we can report it using reject()
               logError("Unable to determine VPN status. Child process most likely failed to read results from stdout. Is ExpressVPN installed?");
          }

          return connectionState;
     }

     // 
     // Recursive function to read stream output asynchronously
     // 
     // @method readOutputAsync
     // @param {String} stream for which text is to be read [stdout, stdin, stderr]
     // @return {Object} an array of strings from the stream output
     // 
     _readOutputAsync(stream, lineBuffer)
     {
          stream.read_line_async(0, null, (stream, async_res) =>
          {
               try
               {
                    let data, len;
                    [data, len] = stream.read_line_finish_utf8(async_res);

                    if (data !== null && len > 0)
                    {
                         // Collect the output
                         lineBuffer.push(data);

                         // Keep calm and carry on recursively reading until done
                         this._readOutputAsync(stream, lineBuffer);
                    }
               }
               catch (e)
               {
                    logError(e);
               }

               return lineBuffer;
          });
     }

     // 
     // @method _waitOnSubProcessToComplete
     //
     // @description Generic method to wait on a subprocess to complete. The method being waiting on
     //              is 'readOutputAsync'. This method lets us know when the subprocess has completed.
     //              It is at this point that we know the underlying buffer with the stdout lines is
     //              now ready to be processed.
     //
     // @private method
     //
     // @param cmdArgs - array of strings representing the cmd to be executed
     // @param pid - The pid to be monitored for completion
     // @param stdoutLines - An array of strings representing the stdout returned from the cmd execution
     // @param stdoutStream - The underlying stdout stream
     // @param stderrStream - The underlying stderr stream
     // 
     async _waitOnSubProcessToComplete(cmdArgs, pid, stdoutLines, stdoutStream, stderrStream)
     {
          return new Promise((resolve, reject) =>
          {
               GLib.child_watch_add(GLib.PRIORITY_DEFAULT_IDLE, pid, (pid, status) =>
               {
                    // If the child process was successful
                    if (status === 0)
                    {
                         Utils.logDebug("Subprocess callback for cmd " + cmdArgs.join(" ") + " pid: " + pid);

                         let count = stdoutLines.length;
                         Utils.logDebug("Lines read: " + count);

                         stdoutLines.forEach(element =>
                         {
                              Utils.logDebug(element);
                         });

                         resolve(stdoutLines);
                    }
                    else
                    {
                         //logError("Child process failed with status: " + status);
                         reject("Unable to process stdout")
                    }

                    Utils.logDebug("Closing streams and pid");

                    // Close the streams and process
                    stdoutStream.close(null);
                    stderrStream.close(null);
                    GLib.spawn_close_pid(pid);
               });
          })
     }

     //
     // @method _processVpnStatus
     // @private
     //
     // @description This callback processes the current state of the express VPN connection. 
     // 
     // The chain of events start from when the eVpnCommandStatus method call is made. This method
     // typically sets up a subprocess to execute the expressVPN status command as you would in shell. 
     // The output of the subprocess is handled in an asynchronous way with a watch added to the subprocess
     // using the process identifer. The eVpnCommandStatus has an anonymous function which gets called 
     // to notify that all the stdout has been read and the subprocess has completed.
     //  
     // This method is registered as a callback within the eVpnCommandStatus and is called from the internal 
     // anonymous function to return back the array of lines from reading the stdout.
     // 
     // The callback is now free to process the results and set the state for the extension 
     //
     // @param {Object} lineBuffer 
     // @returns {Object}
     //

     async _processVpnStatus(lineBuffer)
     {
          return new Promise((resolve, reject) =>
          {
               if (lineBuffer.count === 0)
                    return reject(Symbol.for("Unknown"));

               lineBuffer.forEach(line =>
               {
                    if (line.includes("Connected"))
                    {
                         Utils.logInfo("*** Connected ***");
                         return resolve(Symbol.for("Connected"));
                    }

                    if (line.includes("Not connected"))
                    {
                         Utils.logInfo("*** Not Connected ***");
                         return resolve(Symbol.for("NotConnected"));
                    }

                    if (line.includes("Disconnected"))
                    {
                         Utils.logInfo("*** Disconnected ***");
                         return resolve(Symbol.for("Disconnected"));
                    }

                    if (line.includes('Connecting') || line.includes('Disconnecting') || line.includes('Reconnecting'))
                    {
                         Utils.logInfo("*** Negotiating Connection Status ***");
                         return resolve(Symbol.for("Pending"));
                    }

                    if (line.includes("A new version is available"))
                    {
                         Utils.logInfo("*** Update Available ***");
                    }

                    if (line.includes("- To protect your privacy if your VPN connection unexpectedly drops"))
                    {
                         Utils.logInfo("*** Hints & Tips Available ***");
                    }
               });

               Utils.logNewline();
               return resolve(Symbol.for("Unknown"));
          });
     }
}
