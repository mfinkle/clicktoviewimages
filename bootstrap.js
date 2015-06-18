const { classes: Cc, interfaces: Ci, manager: Cm, utils: Cu, results: Cr } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

let debug = Cu.import("resource://gre/modules/AndroidLog.jsm", {}).AndroidLog.d.bind(null, "ClickToView");

/**
 * Content policy for blocking images
 */

// SVG placeholder image for blocked image content
let DATA_IMG = "data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI%2BDQogIDxnIHN0cm9rZS13aWR0aD0iMzguMDA4NiIgc3Ryb2tlPSIjMDAwIj4NCiAgICA8ZyBpZD0ic3Znc3RhciIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTUwLCAxNTApIj4NCiAgICAgIDxwYXRoIGlkPSJzdmdiYXIiIGZpbGw9IiNmZmIxM2IiIA0KICAgICAgICBkPSJNLTg0LjE0ODcsLTE1Ljg1MTMgYTIyLjQxNzEsMjIuNDE3MSAwIDEgMCAwLDMxLjcwMjYgaDE2OC4yOTc0IGEyMi40MTcxLDIyLjQxNzEgMCAxIDAgMCwtMzEuNzAyNiBaIi8%2BDQogICAgICA8dXNlIHhsaW5rOmhyZWY9IiNzdmdiYXIiIHRyYW5zZm9ybT0icm90YXRlKDQ1KSIvPg0KICAgICAgPHVzZSB4bGluazpocmVmPSIjc3ZnYmFyIiB0cmFuc2Zvcm09InJvdGF0ZSg5MCkiLz4NCiAgICAgIDx1c2UgeGxpbms6aHJlZj0iI3N2Z2JhciIgdHJhbnNmb3JtPSJyb3RhdGUoMTM1KSIvPg0KICAgIDwvZz4NCiAgPC9nPg0KICA8dXNlIHhsaW5rOmhyZWY9IiNzdmdzdGFyIi8%2BDQo8L3N2Zz4%3D";

let ImageBlockingPolicy = {
  classDescription: "Click-To-View Image",
  classID: Components.ID("{f55f77f9-d33d-4759-82fc-60db3ee0bb91}"),
  contractID: "@starkravingfinkle.org/blockimages-policy;1",
  xpcom_categories: ["content-policy"],
  enabled: true,
 
  init: function(aEnabled) {
    let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
    registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
 
    let catMan = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    for each (let category in this.xpcom_categories) {
      catMan.addCategoryEntry(category, this.contractID, this.contractID, false, true);
    }
    this.enabled = aEnabled;
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

  setEnabled: function(aEnabled) {
    this.enabled = aEnabled;
  },

  // nsIContentPolicy interface implementation
  shouldLoad: function(contentType, contentLocation, requestOrigin, node, mimeTypeGuess, extra) {
    if (this.enabled && contentType === Ci.nsIContentPolicy.TYPE_IMAGE) {
      // Allow any non-http(s) image URLs
      if (!contentLocation.schemeIs("http") && !contentLocation.schemeIs("https")) {
        return Ci.nsIContentPolicy.ACCEPT;
      }

      if (node instanceof Ci.nsIDOMHTMLImageElement) {
        dump(node.outerHTML + "\n");
        if (node.getAttribute("data-ctv-show") == "true") {
          return Ci.nsIContentPolicy.ACCEPT;
        }

        setTimeout(() => {
          node.setAttribute("data-ctv-src", contentLocation.spec);
          node.setAttribute("src", DATA_IMG);
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
    let selector =  window.NativeWindow.contextmenus.imageSaveableContext;
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
