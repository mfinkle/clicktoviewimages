const { classes: Cc, interfaces: Ci, manager: Cm, utils: Cu, results: Cr } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

let debug = Cu.import("resource://gre/modules/AndroidLog.jsm", {}).AndroidLog.d.bind(null, "ClickToView");

/**
 * Content policy for blocking images
 */

// SVG placeholder image for blocked image content
let DATA_IMG = "data:image/svg+xml;charset=utf-8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI%2BDQoNCjxzdmcgdmVyc2lvbj0iMS4xIg0KICAgICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciDQogICAgIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIg0KICAgICB4PSIwIg0KICAgICB5PSIwIg0KICAgICB3aWR0aD0iMzIiDQogICAgIGhlaWdodD0iMzIiDQogICAgIHZpZXdCb3g9IjAgMCAzMiAzMiI%2BDQoNCiAgPGRlZnM%2BDQogICAgDQogICAgPG1hc2sgaWQ9Im1hc2stY3V0b3V0LWJsb2NrZWQtc2lnbiI%2BDQogICAgICA8cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNmZmYiIC8%2BDQogICAgICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSI4IiBmaWxsPSIjMDAwIiAvPg0KICAgIDwvbWFzaz4NCg0KICAgIDxtYXNrIGlkPSJtYXNrLWN1dG91dC1mcmFtZSI%2BDQogICAgICA8cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMwMDAiIC8%2BDQogICAgICA8cmVjdCB4PSIyIiB5PSI0IiB3aWR0aD0iMjgiIGhlaWdodD0iMjQiIHJ4PSIzIiByeT0iMyIgZmlsbD0iI2ZmZiIgLz4NCiAgICAgIDxyZWN0IHg9IjQiIHk9IjYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyMCIgcng9IjIiIHJ5PSIyIiBmaWxsPSIjMDAwIiAvPg0KICAgIDwvbWFzaz4NCiAgICANCiAgICA8bWFzayBpZD0ibWFzay1jdXRvdXQtYmxvY2tlZC1zaWduLWlubmVyIj4NCiAgICAgIDxyZWN0IHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iI2ZmZiIgLz4NCiAgICAgIDxjaXJjbGUgY3g9IjI1IiBjeT0iMjUiIHI9IjQiIGZpbGw9IiMwMDAiIC8%2BDQogICAgPC9tYXNrPg0KDQogIDwvZGVmcz4NCg0KICA8ZyBpZD0iaWNvbi1mcmFtZSIgbWFzaz0idXJsKCNtYXNrLWN1dG91dC1ibG9ja2VkLXNpZ24pIj4NCiAgICA8cmVjdCBpZD0ic2hhcGUtYmFja2dyb3VuZCIgeD0iMiIgeT0iNCIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI0IiByeD0iMyIgcnk9IjMiIGZpbGw9IiNmMGYxZjIiIC8%2BDQogICAgPHBvbHlnb24gcG9pbnRzPSIzLDI2IDExLDE2IDE4LDI2IiBmaWxsPSIjN2U3ZjgwIiAvPg0KICAgIDxwb2x5Z29uIHBvaW50cz0iMTEsMjYgMjMsMTAgMzEsMjAgMzEsMjYiIGZpbGw9IiM0YzRjNGQiIC8%2BDQogICAgPGNpcmNsZSBjeD0iOSIgY3k9IjExIiByPSIzIiBmaWxsPSIjOTc5ODk5IiAvPg0KICAgIDxyZWN0IHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzY1NjU2NiIgbWFzaz0idXJsKCNtYXNrLWN1dG91dC1mcmFtZSkiIC8%2BDQogIDwvZz4NCiAgPGcgaWQ9Imljb24tYmxvY2tlZC1zaWduIj4NCiAgICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSI2IiBmaWxsPSIjNjU2NTY2IiBtYXNrPSJ1cmwoI21hc2stY3V0b3V0LWJsb2NrZWQtc2lnbi1pbm5lcikiIC8%2BDQogICAgPGxpbmUgeDE9IjIxIiB5MT0iMjkiIHgyPSIyOSIgeTI9IjIxIiBzdHJva2U9IiM2NTY1NjYiIHN0cm9rZS13aWR0aD0iMiIgLz4NCiAgPC9nPg0KDQo8L3N2Zz4NCg%3D%3D";

let ImageBlockingPolicy = {
  classDescription: "Click-To-View Image",
  classID: Components.ID("{f55f77f9-d33d-4759-82fc-60db3ee0bb91}"),
  contractID: "@starkravingfinkle.org/blockimages-policy;1",
  xpcom_categories: ["content-policy"],
  enabled: true,
 
  init: function(enabled) {
    let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
    registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
 
    let catMan = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    for each (let category in this.xpcom_categories) {
      catMan.addCategoryEntry(category, this.contractID, this.contractID, false, true);
    }
    this.enabled = enabled;
  },
 
  uninit: function() {
    let catMan = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    for each(let category in this.xpcom_categories) {
      catMan.deleteCategoryEntry(category, this.contractID, false);
    }
 
    // This needs to run asynchronously, see bug 753687
    Services.tm.currentThread.dispatch(function() {
      let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
      registrar.unregisterFactory(this.classID, this);
    }.bind(this), Ci.nsIEventTarget.DISPATCH_NORMAL);
  },

  setEnabled: function(enabled) {
    this.enabled = enabled;
  },

  // nsIContentPolicy interface implementation
  shouldLoad: function(contentType, contentLocation, requestOrigin, node, mimeTypeGuess, extra) {
    if (!this.enabled) {
      return Ci.nsIContentPolicy.ACCEPT;
    }

    if (contentType === Ci.nsIContentPolicy.TYPE_IMAGE || contentType === Ci.nsIContentPolicy.TYPE_IMAGESET) {
      // Accept any non-http(s) image URLs
      if (!contentLocation.schemeIs("http") && !contentLocation.schemeIs("https")) {
        return Ci.nsIContentPolicy.ACCEPT;
      }

      if (node instanceof Ci.nsIDOMHTMLImageElement) {
        dump(node.outerHTML + "\n");
        // Accept if the user has asked to view the image
        if (node.getAttribute("data-ctv-show") == "true") {
          return Ci.nsIContentPolicy.ACCEPT;
        }

        setTimeout(() => {
          // Cache the original image URL and swap in our placeholder
          node.setAttribute("data-ctv-src", contentLocation.spec);
          node.setAttribute("src", DATA_IMG);

          // For imageset (img + srcset) the "srcset" is used even after we reset the "src" causing a loop.
          // We are given the final image URL anyway, so it's OK to just remove the "srcset" value.
          node.removeAttribute("srcset");
        }, 0);
      }

      // Reject any image that is not associated with a DOM element
      return Ci.nsIContentPolicy.REJECT;
    }

    // Accept all other content types
    return Ci.nsIContentPolicy.ACCEPT;
  },
 
  shouldProcess: function(contentType, contentLocation, requestOrigin, node, mimeTypeGuess, extra) {
    return Ci.nsIContentPolicy.ACCEPT;
  },
 
  // nsIFactory interface implementation
  createInstance: function(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  },
 
  // nsISupports interface implementation
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIFactory])
};


/**
 * UI code
 */

var NativeUI = {
  contextmenus: {
    show: null
  },

  createUI: function createUI(window) {
    let selector = {
      matches: function(element) {
        if (element instanceof Ci.nsIDOMHTMLImageElement) {
          // Only show the menuitem if we are blocking the image
          if (element.getAttribute("data-ctv-show") == "true") {
            return false;
          }
          return true;
        }
        return false;
      }
    }
    this.contextmenus.show = window.NativeWindow.contextmenus.add("Show Image", selector, (target) => {
      target.setAttribute("data-ctv-show", "true");
      target.setAttribute("src", target.getAttribute("data-ctv-src"));
    });
  },

  _removeMenu: function _removeMenu(window, id) {
    if (id) {
      window.NativeWindow.contextmenus.remove(id);
    }
  },

  removeUI: function removeUI(window) {
    this._removeMenu(window, this.contextmenus.show);
  }
};

function loadIntoWindow(window) {
  if (!window) {
    return;
  }

  // Setup the UI when we get a window
  NativeUI.createUI(window);
}

function unloadFromWindow(window) {
  if (!window) {
    return;
  }

  // Register to remove the UI on shutdown
  NativeUI.removeUI(window);
}

var WindowWatcher = {
  start: function() {
    // Load into any existing windows
    let windows = Services.wm.getEnumerator("navigator:browser");
    while (windows.hasMoreElements()) {
      let window = windows.getNext();
      if (window.document.readyState == "complete") {
        loadIntoWindow(window);
      } else {
        this.waitForLoad(window);
      }
    }

    // Load into any new windows
    Services.ww.registerNotification(this);
  },

  stop: function() {
    // Stop listening for new windows
    Services.ww.unregisterNotification(this);

    // Unload from any existing windows
    let windows = Services.wm.getEnumerator("navigator:browser");
    while (windows.hasMoreElements()) {
      let window = windows.getNext();
      unloadFromWindow(window);
    }
  },

  waitForLoad: function(window) {
    window.addEventListener("load", function onLoad() {
      window.removeEventListener("load", onLoad, false);
      let { documentElement } = window.document;
      if (documentElement.getAttribute("windowtype") == "navigator:browser") {
        loadIntoWindow(window);
      }
    }, false);
  },

  observe: function(subject, topic, data) {
    if (topic == "domwindowopened") {
      this.waitForLoad(subject);
    }
  }
};

/**
* Handle the add-on being activated on install/enable
*/
function startup(data, reason) {
  ImageBlockingPolicy.init(true);
  WindowWatcher.start();
}

/**
* Handle the add-on being deactivated on uninstall/disable
*/
function shutdown(data, reason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (reason == APP_SHUTDOWN) {
    return;
  }

  WindowWatcher.stop();
  ImageBlockingPolicy.uninit();
}

/**
* Handle the add-on being installed
*/
function install(data, reason) {}

/**
* Handle the add-on being uninstalled
*/
function uninstall(data, reason) {}
