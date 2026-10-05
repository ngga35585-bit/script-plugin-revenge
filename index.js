(function () {
  // === CONFIG: paste your Supabase values (Project Settings → API Keys) ===
  var SUPABASE_URL = "https://lwxquiuwughqzbausore.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eHF1aXV3dWdocXpiYXVzb3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzMyOTgsImV4cCI6MjEwNjc0OTI5OH0.U6JsNeNJAaG_Fx6uRMuxl1bGqZkFAZnmW4DSBKDeIFA";
  // =================================================================

  var configured = SUPABASE_URL.indexOf("YOUR-PROJECT") === -1 && SUPABASE_KEY.indexOf("YOUR-") === -1;
  var CREDIT = "All done by Becali.18m";
  var VERSION = "4.0";
  var G = typeof globalThis !== "undefined" ? globalThis : {};

  var React = vendetta.metro.common.React;
  var RN = vendetta.metro.common.ReactNative;
  var View = RN.View, Text = RN.Text, TextInput = RN.TextInput, ScrollView = RN.ScrollView;
  var Switch = RN.Switch, Image = RN.Image, Linking = RN.Linking, Platform = RN.Platform;
  var Dimensions = RN.Dimensions, PixelRatio = RN.PixelRatio;
  var Press = RN.Pressable || RN.TouchableOpacity;
  var storage = vendetta.plugin.storage;
  var useProxy = vendetta.storage.useProxy;
  var showToast = vendetta.ui.toasts.showToast;
  var alerts = vendetta.ui.alerts;
  var patcher = vendetta.patcher;
  var metro = vendetta.metro;
  var findByName = metro.findByName;
  var findByProps = metro.findByProps;
  var findByStoreName = metro.findByStoreName || function () { return undefined; };
  var UserStore = null;
  var h = React.createElement;

  var C = {
    card: "#2b2d31", input: "#1e1f22", text: "#f2f3f5", sub: "#b5bac1",
    green: "#248046", danger: "#da373c", heart: "#f23f43", line: "#3f4147",
    warn: "#f0b232", info: "#4fa3ff", bot: "#16283a"
  };

  // ---------- settings ----------
  var BTN = {
    white: { bg: "#ffffff", fg: "#111214", border: null },
    blue: { bg: "#5865f2", fg: "#ffffff", border: null },
    green: { bg: "#248046", fg: "#ffffff", border: null },
    red: { bg: "#da373c", fg: "#ffffff", border: null },
    black: { bg: "#000000", fg: "#ffffff", border: "#4e5058" }
  };
  var BTN_LIST = [["white", "White"], ["blue", "Blue"], ["green", "Green"], ["red", "Red"], ["black", "Black"]];
  var DEFAULTS = {
    btnColor: "blue", compact: false, showAvatars: true, codeSize: 13,
    anonymous: false, reportErrors: true,
    autoRun: true, confirmEnable: true, termHistory: true
  };
  function cfg(k) {
    var s = storage.settings;
    return s && s[k] !== undefined ? s[k] : DEFAULTS[k];
  }
  function setCfg(k, v) {
    var next = Object.assign({}, DEFAULTS, storage.settings || {});
    next[k] = v;
    storage.settings = next;
  }
  function theme() { return BTN[cfg("btnColor")] || BTN.blue; }

  var EXAMPLE =
    "// Example: toast on start\n" +
    "toast('My script works!');\n\n" +
    "// Styling: replace 'ComponentName' with a real component name\n" +
    "// patchComponent('ComponentName', { borderRadius: 24 });\n" +
    "// Move: patchComponent('ComponentName', { transform: [{ translateY: 10 }] });\n\n" +
    "// Modern API (see the Terminal tab: type api()):\n" +
    "// revenge.patcher.after('funcName', someModule, function (args, ret) {});\n" +
    "// return function () { /* optional cleanup when the script stops */ };\n";

  // ---------- utils ----------
  function avatarOf(u) {
    try {
      var a = u.getAvatarURL && u.getAvatarURL(undefined, 64, false);
      if (a && typeof a === "object" && typeof a.uri === "string") a = a.uri;
      if (typeof a === "string") {
        if (a.indexOf("//") === 0) a = "https:" + a;
        if (a.indexOf("http") === 0) return a;
      }
    } catch (e) {}
    if (u.avatar) return "https://cdn.discordapp.com/avatars/" + u.id + "/" + u.avatar + ".png?size=64";
    return "https://cdn.discordapp.com/embed/avatars/" + (Number(String(u.id).slice(-1)) % 5) + ".png";
  }
  function me() {
    UserStore = UserStore || findByStoreName("UserStore");
    var u = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
    if (!u) return { id: "anon", name: "anonymous", avatar: "" };
    return { id: String(u.id), name: u.globalName || u.username || "user", avatar: avatarOf(u) };
  }
  // what other people see: honours the Anonymous setting
  function identity() {
    var u = me();
    if (cfg("anonymous")) return { id: u.id, name: "Anonymous", avatar: "" };
    return u;
  }
  function makeToken() {
    var t = "";
    try {
      var c = G.crypto;
      if (c && c.getRandomValues) {
        var a = new Uint8Array(24);
        c.getRandomValues(a);
        for (var i = 0; i < a.length; i++) t += (a[i] % 36).toString(36);
      }
    } catch (e) { t = ""; }
    if (t.length < 24) {
      t = "";
      for (var j = 0; j < 4; j++) t += Math.random().toString(36).slice(2);
    }
    return t;
  }
  function errToast(e) { showToast(e && e.message ? e.message : String(e)); }
  function confirmBox(title, content, onConfirm) {
    if (alerts && alerts.showConfirmationAlert) {
      alerts.showConfirmationAlert({ title: title, content: content, confirmText: "Continue", cancelText: "Cancel", onConfirm: onConfirm });
    } else onConfirm();
  }
  function copy(text) {
    try {
      var cb = (metro.common && metro.common.clipboard) || findByProps("setString", "getString");
      if (!cb && RN.Clipboard) cb = RN.Clipboard;
      if (cb && cb.setString) { cb.setString(String(text)); return true; }
    } catch (e) {}
    return false;
  }
  function timeAgo(iso) {
    var t = Date.parse(iso);
    if (!t) return "";
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }
  function hasTag(body, tag) { return new RegExp("(^|\\s)@" + tag + "\\b", "i").test(body || ""); }

  // readable value printer (terminal + log)
  function fmt(v, depth, seen, top) {
    var t = typeof v;
    if (v === null) return "null";
    if (t === "undefined") return "undefined";
    if (t === "string") return top ? v : JSON.stringify(v.length > 200 ? v.slice(0, 200) + "\u2026" : v);
    if (t === "number" || t === "boolean" || t === "bigint" || t === "symbol") return String(v);
    if (t === "function") return "\u0192 " + (v.name || "anonymous") + "()";
    seen = seen || [];
    try {
      if (v instanceof Error) return (v.name || "Error") + ": " + v.message;
      if (seen.indexOf(v) >= 0) return "[Circular]";
      var isArr = Array.isArray(v);
      if (depth <= 0) return isArr ? "Array(" + v.length + ")" : "{\u2026}";
      seen = seen.concat([v]);
      var out, keys;
      if (isArr) {
        out = v.slice(0, 30).map(function (x) { return fmt(x, depth - 1, seen); });
        if (v.length > 30) out.push("\u2026+" + (v.length - 30));
        return "[" + out.join(", ") + "]";
      }
      keys = Object.keys(v);
      out = keys.slice(0, 30).map(function (k) {
        var val;
        try { val = fmt(v[k], depth - 1, seen); } catch (e) { val = "<" + (e && e.message) + ">"; }
        return k + ": " + val;
      });
      if (keys.length > 30) out.push("\u2026+" + (keys.length - 30));
      var cn = v.constructor && v.constructor.name;
      return (cn && cn !== "Object" ? cn + " " : "") + "{ " + out.join(", ") + " }";
    } catch (e) {
      try { return Object.prototype.toString.call(v); } catch (e2) { return "?"; }
    }
  }
  function show(v, depth) {
    var s = fmt(v, depth === undefined ? 2 : depth, [], true);
    return s.length > 4000 ? s.slice(0, 4000) + "\u2026" : s;
  }
  function joinArgs(args) { return Array.prototype.map.call(args, function (a) { return show(a, 2); }).join(" "); }

  // ---------- backend ----------
  function sb(path, opts) {
    opts = opts || {};
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    function done() { if (timer) { clearTimeout(timer); timer = null; } }
    return fetch(SUPABASE_URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: SUPABASE_KEY.indexOf("sb_") === 0
        ? { apikey: SUPABASE_KEY, "Content-Type": "application/json" }
        : { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        done();
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
        if (!r.ok) {
          var m = (j && j.message) || ("Error " + r.status);
          if (/schema cache|Could not find the function/i.test(m)) {
            m = "Backend not updated: run setup_v4.sql in Supabase (" + path.split("?")[0] + ")";
          }
          throw new Error(m);
        }
        return j;
      });
    }, function (e) {
      done();
      if (e && e.name === "AbortError") throw new Error("Request timed out");
      throw e;
    });
  }
  function rpc(fn, body) { return sb("rpc/" + fn, { method: "POST", body: body }); }

  function loadScripts(q, sort) {
    var order = sort === "oldest" ? "created_at.asc" : sort === "liked" ? "likes.desc,created_at.desc" : "created_at.desc";
    var url = "public_scripts?select=id,name,description,image_url,author_name,likes,installs,created_at&order=" + order + "&limit=50";
    if (q) url += "&name=ilike." + encodeURIComponent("*" + q + "*");
    return sb(url);
  }

  // ---------- terminal log buffer (also receives script logs/errors) ----------
  var termLines = [], termSubs = [], termSeq = 0;
  function termLog(kind, text) {
    termLines.push({ id: ++termSeq, k: kind, t: String(text) });
    if (termLines.length > 400) termLines.splice(0, termLines.length - 400);
    termSubs.slice().forEach(function (f) { try { f(); } catch (e) {} });
  }

  // ---------- userscript engine ----------
  var running = {}, lastErrors = {}, failSeen = {};
  var ASYNC_OK = (function () { try { (0, eval)("(async function(){})"); return true; } catch (e) { return false; } })();
  var SCRIPT_ARGS = ["vendetta", "revenge", "React", "ReactNative", "findByName", "findByProps", "findByStoreName",
    "patch", "patchComponent", "cleanup", "toast", "log", "console"];

  function wrapSource(code) {
    return "(" + (ASYNC_OK ? "async " : "") + "function(" + SCRIPT_ARGS.join(",") + "){\n" + code + "\n})";
  }
  // compiles only, never runs the code
  function checkSyntax(code) {
    try { new Function("return " + wrapSource(code)); return null; }
    catch (e) { return e && e.message ? e.message : String(e); }
  }
  // read-only lookups of names used as string literals; never runs the code
  function staticChecks(code) {
    var out = [], m, re, found;
    re = /(patchComponent|findByName)\(\s*(["'])([^"'\n]+)\2/g;
    while ((m = re.exec(code)) && out.length < 10) {
      found = null;
      try { found = findByName(m[3], false); } catch (e) {}
      if (!found) out.push(m[1] + '("' + m[3] + '") finds nothing on this client');
    }
    re = /findByProps\(\s*((?:["'][^"'\n]+["']\s*,\s*)*["'][^"'\n]+["'])\s*\)/g;
    while ((m = re.exec(code)) && out.length < 10) {
      var props = m[1].match(/["']([^"'\n]+)["']/g).map(function (x) { return x.slice(1, -1); });
      found = null;
      try { found = findByProps.apply(null, props); } catch (e) {}
      if (!found) out.push('findByProps("' + props.join('", "') + '") finds nothing on this client');
    }
    return out;
  }

  function fail(ctx, e, loud) {
    var msg = e && e.message ? e.message : String(e);
    var name = (ctx && ctx.name) || "terminal";
    var key = name + "|" + msg, now = Date.now();
    if (failSeen[key] && now - failSeen[key] < 5000) return;
    if (Object.keys(failSeen).length > 200) failSeen = {};
    failSeen[key] = now;
    termLog("err", "[" + name + "] " + msg);
    var s = ctx && ctx.script;
    if (!s) return;
    lastErrors[String(s.remoteId || s.id)] = msg;
    if (loud) showToast("[" + name + "] " + msg);
    // only the error text + script id leave the phone
    if (configured && s.remoteId && cfg("reportErrors")) {
      rpc("report_error", { p_script: String(s.remoteId), p_message: msg }).catch(function () {});
    }
  }

  function stop(id) {
    var list = running[id];
    if (!list) return;
    delete running[id];
    list.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  // patcher wrapper: a broken callback can't crash Discord, and unpatches on stop
  function safePatch(type, funcName, parent, cb, once, cleanups, ctx) {
    if (type !== "before" && type !== "after" && type !== "instead") throw new Error("patch type must be before, after or instead");
    if (typeof cb !== "function") throw new Error("patch callback must be a function");
    if (!parent || typeof parent[funcName] !== "function") throw new Error("Nothing to patch: " + String(funcName));
    var wrapped = function () {
      try { return cb.apply(this, arguments); }
      catch (e) {
        fail(ctx, e);
        if (type === "instead") return arguments[1].apply(this, arguments[0]);
      }
    };
    var un = patcher[type](funcName, parent, wrapped, once);
    cleanups.push(un);
    return un;
  }
  function patchComponentFn(name, style, ctx) {
    var mod = findByName(name, false);
    if (!mod || typeof mod.default !== "function") throw new Error("Component not found: " + name);
    return patcher.after("default", mod, function (args, ret) {
      try {
        if (!ret || !ret.props) return;
        var extra = typeof style === "function" ? style(args[0], ret) : style;
        return React.cloneElement(ret, { style: [ret.props.style, extra] });
      } catch (e) { fail(ctx, e); }
    });
  }

  // ---------- revenge.* for scripts ----------
  // If a real global `revenge` exists, its members win; anything it lacks is filled in
  // from the vendetta compatibility layer. The real object stays reachable as revenge.<ns>.native
  var NS_NAMES = ["ui", "storage", "events", "modules", "discord", "navigation", "browser", "device", "patcher"];
  var WRAP = { patcher: ["before", "after", "instead", "patch"], events: ["on", "subscribe"] };
  var bus = {};
  function busOn(n, fn) {
    (bus[n] = bus[n] || []).push(fn);
    return function () { bus[n] = (bus[n] || []).filter(function (x) { return x !== fn; }); };
  }
  var discordCache = null;
  function getDiscord() {
    var d = discordCache = discordCache || {};
    ["UserStore", "GuildStore", "ChannelStore", "MessageStore", "SelectedChannelStore", "SelectedGuildStore",
      "RelationshipStore", "PresenceStore", "GuildMemberStore", "PermissionStore"].forEach(function (n) {
      if (!d[n]) { try { d[n] = findByStoreName(n); } catch (e) {} }
    });
    return d;
  }
  function nativeNs(name) {
    try {
      var r = G.revenge, v = r && r[name];
      return v && (typeof v === "object" || typeof v === "function") ? v : null;
    } catch (e) { return null; }
  }
  function layer(name, fallback, cleanups) {
    var out = Object.assign({}, fallback);
    var real = nativeNs(name);
    var wrapNames = WRAP[name] || [];
    if (real) {
      try {
        Object.keys(real).forEach(function (k) {
          try {
            var v = real[k];
            if (typeof v === "function" && wrapNames.indexOf(k) >= 0) {
              out[k] = (function (fn) {
                return function () {
                  var r = fn.apply(this, arguments);
                  if (typeof r === "function") cleanups.push(r);
                  return r;
                };
              })(v);
            } else out[k] = v;
          } catch (e) {}
        });
      } catch (e) {}
      out.native = real;
    }
    return out;
  }

  function makeRevenge(cleanups, ctx) {
    var common = metro.common || {};
    var Flux = common.FluxDispatcher || findByProps("dispatch", "subscribe");
    var nav = common.NavigationNative || {};
    var fb = {};

    fb.ui = {
      toast: function (t) { showToast(String(t)); },
      showToast: showToast,
      confirm: function (title, content) {
        return new Promise(function (resolve) {
          if (!alerts || !alerts.showConfirmationAlert) return resolve(true);
          alerts.showConfirmationAlert({
            title: title, content: content, confirmText: "OK", cancelText: "Cancel",
            onConfirm: function () { resolve(true); }, onCancel: function () { resolve(false); }
          });
        });
      },
      toasts: vendetta.ui.toasts, alerts: alerts,
      components: vendetta.ui.components, assets: vendetta.ui.assets
    };

    fb.storage = Object.assign({}, vendetta.storage || {});

    fb.events = {
      on: function (n, fn) { var un = busOn(n, fn); cleanups.push(un); return un; },
      off: function (n, fn) { bus[n] = (bus[n] || []).filter(function (x) { return x !== fn; }); },
      emit: function (n, data) {
        (bus[n] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { fail(ctx, e); } });
      },
      flux: Flux,
      subscribe: function (type, fn) {
        if (!Flux) throw new Error("FluxDispatcher not found");
        Flux.subscribe(type, fn);
        var un = function () { Flux.unsubscribe(type, fn); };
        cleanups.push(un);
        return un;
      },
      dispatch: function (action) {
        if (!Flux) throw new Error("FluxDispatcher not found");
        return Flux.dispatch(action);
      }
    };

    fb.modules = Object.assign({}, metro);

    var d = getDiscord();
    fb.discord = Object.assign({}, d, {
      FluxDispatcher: Flux, constants: common.constants, i18n: common.i18n, moment: common.moment,
      currentUser: function () { return d.UserStore && d.UserStore.getCurrentUser && d.UserStore.getCurrentUser(); },
      currentChannelId: function () { return d.SelectedChannelStore && d.SelectedChannelStore.getChannelId && d.SelectedChannelStore.getChannelId(); },
      currentGuildId: function () { return d.SelectedGuildStore && d.SelectedGuildStore.getGuildId && d.SelectedGuildStore.getGuildId(); },
      sendMessage: function (channelId, content) {
        var m = findByProps("sendMessage", "receiveMessage");
        if (!m) throw new Error("Message module not found");
        return m.sendMessage(channelId, { content: String(content), tts: false, invalidEmojis: [], validNonShortcutEmojis: [] });
      }
    });

    fb.navigation = {
      NavigationNative: common.NavigationNative, NavigationStack: common.NavigationStack,
      useNavigation: nav.useNavigation, useRoute: nav.useRoute,
      StackActions: nav.StackActions, CommonActions: nav.CommonActions,
      openChannel: function (guildId, channelId) {
        return Linking.openURL("https://discord.com/channels/" + (guildId || "@me") + "/" + channelId);
      }
    };

    fb.browser = {
      open: function (url) {
        url = String(url);
        if (!/^https?:\/\//i.test(url)) throw new Error("Only http(s) links can be opened");
        return Linking.openURL(url);
      },
      canOpen: function (url) { return Linking.canOpenURL(String(url)); },
      copy: copy,
      fetchText: function (url, init) { return fetch(url, init).then(function (r) { return r.text(); }); },
      fetchJSON: function (url, init) { return fetch(url, init).then(function (r) { return r.json(); }); }
    };

    fb.device = {
      os: Platform.OS, osVersion: Platform.Version, isAndroid: Platform.OS === "android", isIOS: Platform.OS === "ios",
      constants: Platform.constants,
      pixelRatio: PixelRatio && PixelRatio.get ? PixelRatio.get() : 1,
      fontScale: PixelRatio && PixelRatio.getFontScale ? PixelRatio.getFontScale() : 1,
      window: function () { return Dimensions.get("window"); },
      screen: function () { return Dimensions.get("screen"); },
      hermes: !!G.HermesInternal
    };

    fb.patcher = {
      before: function (fn, parent, cb, once) { return safePatch("before", fn, parent, cb, once, cleanups, ctx); },
      after: function (fn, parent, cb, once) { return safePatch("after", fn, parent, cb, once, cleanups, ctx); },
      instead: function (fn, parent, cb, once) { return safePatch("instead", fn, parent, cb, once, cleanups, ctx); },
      patchComponent: function (name, style) { var un = patchComponentFn(name, style, ctx); cleanups.push(un); return un; },
      raw: patcher
    };

    var rv = {};
    NS_NAMES.forEach(function (n) { rv[n] = layer(n, fb[n], cleanups); });
    rv.native = G.revenge || null;
    return rv;
  }

  function makeApi(cleanups, ctx) {
    var tag = ctx && ctx.name ? "[" + ctx.name + "] " : "";
    function mk(kind, real) {
      return function () {
        termLog(kind, tag + joinArgs(arguments));
        try { if (console[real]) console[real].apply(console, arguments); } catch (e) {}
      };
    }
    var con = { log: mk("log", "log"), info: mk("info", "info"), warn: mk("warn", "warn"), error: mk("err", "error"), debug: mk("log", "debug") };
    return {
      vendetta: vendetta,
      revenge: makeRevenge(cleanups, ctx),
      React: React, ReactNative: RN,
      findByName: findByName, findByProps: findByProps, findByStoreName: findByStoreName,
      patch: function (type, fn, parent, cb) { return safePatch(type, fn, parent, cb, undefined, cleanups, ctx); },
      patchComponent: function (name, style) { var un = patchComponentFn(name, style, ctx); cleanups.push(un); return un; },
      cleanup: function (fn) { if (typeof fn === "function") cleanups.push(fn); },
      toast: function (t) { showToast(String(t)); },
      log: con.log, console: con
    };
  }

  function start(s) {
    stop(s.id);
    var cleanups = [];
    running[s.id] = cleanups;
    var ctx = { script: s, name: s.name };
    function die(e) {
      if (running[s.id] === cleanups) stop(s.id);
      fail(ctx, e, true);
    }
    try {
      var api = makeApi(cleanups, ctx);
      var factory = (0, eval)(wrapSource(s.code));
      var ret = factory.apply(null, SCRIPT_ARGS.map(function (k) { return api[k]; }));
      if (ret && typeof ret.then === "function") {
        ret.then(function (r) {
          if (typeof r !== "function") return;
          if (running[s.id] === cleanups) cleanups.push(r);
          else { try { r(); } catch (e) {} }
        }, die);
      } else if (typeof ret === "function") cleanups.push(ret);
    } catch (e) { die(e); }
  }
  function update(id, patch) {
    storage.scripts = (storage.scripts || []).map(function (s) {
      return s.id === id ? Object.assign({}, s, patch) : s;
    });
  }
  function ensure() {
    if (!Array.isArray(storage.scripts)) {
      storage.scripts = [{ id: "s0", name: "Example", description: "Shows a toast.", image: "", code: EXAMPLE, enabled: false }];
    }
    var s = storage.settings;
    var missing = !s || typeof s !== "object";
    if (!missing) Object.keys(DEFAULTS).forEach(function (k) { if (s[k] === undefined) missing = true; });
    if (missing) storage.settings = Object.assign({}, DEFAULTS, s && typeof s === "object" ? s : {});
    if (!Array.isArray(storage.termHistory)) storage.termHistory = [];
  }
  function ownedLocal(remoteId) {
    var list = storage.scripts || [];
    for (var i = 0; i < list.length; i++) {
      if (!list[i].fromMarket && list[i].token && String(list[i].remoteId) === String(remoteId)) return list[i];
    }
    return null;
  }
  function claimOwner(s) {
    var idn = identity();
    return rpc("claim_owner", {
      p_script: String(s.remoteId), p_token: s.token, p_name: s.name, p_description: s.description || "",
      p_image: s.image || "", p_code: s.code, p_display_name: idn.name, p_avatar: idn.avatar
    }).then(function () { update(s.id, { claimed: true }); return true; });
  }
  function syncIdentity() {
    if (!configured) return 0;
    var idn = identity();
    var mine = (storage.scripts || []).filter(function (s) { return s.isPublic && s.claimed && s.remoteId && s.token && !s.fromMarket; });
    mine.forEach(function (s) {
      rpc("set_owner_display", { p_script: String(s.remoteId), p_token: s.token, p_display_name: idn.name, p_avatar: idn.avatar }).catch(function () {});
    });
    return mine.length;
  }
  function ideaBlock(body, author) {
    var text = String(body).replace(/(^|\s)@idea\b/ig, " ").trim();
    var m = text.match(/```(?:js|javascript)?\s*\n?([\s\S]*?)```/);
    if (m && m[1].trim()) return "// --- idea from " + author + " (review before saving) ---\n" + m[1].trim();
    return "// IDEA from " + author + ":\n" + text.split("\n").map(function (l) { return "// " + l; }).join("\n");
  }
  function appendCode(code, block) { return String(code || "").replace(/\s*$/, "") + "\n\n" + block + "\n"; }

  // @error: compile check + read-only name lookups + errors users reported. Never runs the script.
  function analyze(scriptId, code) {
    var lines = [];
    var syn = checkSyntax(code);
    lines.push(syn ? "\u274C Syntax error: " + syn : "\u2705 Syntax OK");
    staticChecks(code).forEach(function (m) { lines.push("\u26A0 " + m); });
    var local = lastErrors[String(scriptId)];
    if (local) lines.push("On this phone: " + local);
    return rpc("list_errors", { p_script: String(scriptId), p_limit: 5 }).then(function (rows) {
      if (rows && rows.length) {
        lines.push("Runtime errors reported by users:");
        rows.forEach(function (r) { lines.push("\u2022 " + r.message + " (\u00D7" + r.hits + ", " + timeAgo(r.last_at) + ")"); });
      } else lines.push("No runtime errors reported yet.");
      return lines;
    }).catch(function () { lines.push("(couldn't load reported errors)"); return lines; });
  }

  // ---------- small UI helpers ----------
  function Btn(label, onPress, color, disabled, key) {
    var th = theme();
    var bg = color || th.bg, fg = color ? "#fff" : th.fg;
    return h(Press, {
      key: key, onPress: disabled ? undefined : onPress,
      style: {
        backgroundColor: bg, opacity: disabled ? 0.5 : 1, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16,
        marginRight: 8, marginTop: 8, borderWidth: !color && th.border ? 1 : 0, borderColor: th.border || "transparent"
      }
    }, h(Text, { style: { color: fg, fontWeight: "600" } }, label));
  }
  function Pill(label, active, onPress) {
    var th = theme();
    return h(Press, {
      key: label, onPress: onPress,
      style: {
        backgroundColor: active ? th.bg : C.card, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
        marginRight: 8, marginBottom: 8, borderWidth: active && th.border ? 1 : 0, borderColor: th.border || "transparent"
      }
    }, h(Text, { style: { color: active ? th.fg : C.sub, fontWeight: "600", fontSize: 13 } }, label));
  }
  function Field(value, onChange, placeholder, extra) {
    return h(TextInput, Object.assign({
      value: value, onChangeText: onChange, placeholder: placeholder, placeholderTextColor: C.sub,
      autoCapitalize: "none", autoCorrect: false, spellCheck: false,
      style: Object.assign({ backgroundColor: C.input, color: C.text, borderRadius: 12, padding: 12, marginBottom: 8 }, (extra && extra.style) || {})
    }, extra && extra.props ? extra.props : {}));
  }
  // multi-line field (the old version had no `multiline`, so code could not contain new lines)
  function Area(value, onChange, placeholder, minHeight, mono) {
    return Field(value, onChange, placeholder, {
      props: { multiline: true, textAlignVertical: "top" },
      style: Object.assign({ minHeight: minHeight }, mono ? { fontFamily: "monospace", fontSize: cfg("codeSize") } : {})
    });
  }
  function Cover(uri, height) {
    if (cfg("compact") || !uri || uri.indexOf("http") !== 0) return null;
    return h(Image, { source: { uri: uri }, resizeMode: "cover", style: { width: "100%", height: height, borderRadius: 12, marginBottom: 10, backgroundColor: C.input } });
  }
  function Avatar(uri, name, size) {
    size = size || 28;
    var anon = !name || name === "Anonymous";
    if (cfg("showAvatars") && uri && uri.indexOf("http") === 0) {
      return h(Image, { source: { uri: uri }, style: { width: size, height: size, borderRadius: size / 2, backgroundColor: C.input, marginRight: 8 } });
    }
    return h(View, { style: { width: size, height: size, borderRadius: size / 2, backgroundColor: C.line, alignItems: "center", justifyContent: "center", marginRight: 8 } },
      h(Text, { style: { color: C.text, fontWeight: "700", fontSize: size * 0.45 } }, anon ? "?" : String(name).charAt(0).toUpperCase()));
  }
  function Badge(label, color) {
    return h(View, { key: label, style: { backgroundColor: color, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 } },
      h(Text, { style: { color: "#fff", fontSize: 10, fontWeight: "700" } }, label));
  }
  function card(extra) {
    var c = cfg("compact");
    return Object.assign({ backgroundColor: C.card, borderRadius: 16, padding: c ? 8 : 12, marginBottom: c ? 8 : 12 }, extra || {});
  }
  var WARN = "Scripts run code with full access to the app. Only enable scripts you have read and trust.";

  // ---------- comments (@error / @idea) ----------
  function Comments(p) {
    var ls = React.useState([]), list = ls[0], setList = ls[1];
    var ld = React.useState(true), loading = ld[0], setLoading = ld[1];
    var er = React.useState(null), err = er[0], setErr = er[1];
    var tx = React.useState(""), text = tx[0], setText = tx[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var bt = React.useState(null), bot = bt[0], setBot = bt[1];
    var tk = React.useState(0), tick = tk[0], setTick = tk[1];
    var hasError = list.some(function (c) { return hasTag(c.body, "error"); });

    React.useEffect(function () {
      var dead = false;
      setLoading(true); setBot(null);
      rpc("list_comments", { p_script: String(p.scriptId), p_user: me().id, p_limit: 50 })
        .then(function (rows) { if (!dead) { setList((rows || []).slice().reverse()); setErr(null); } })
        .catch(function (e) { if (!dead) setErr(e.message || String(e)); })
        .then(function () { if (!dead) setLoading(false); });
      return function () { dead = true; };
    }, [p.scriptId, tick]);

    React.useEffect(function () {
      if (!hasError || bot !== null || typeof p.code !== "string") return;
      var dead = false;
      analyze(p.scriptId, p.code).then(function (lines) { if (!dead) setBot(lines); });
      return function () { dead = true; };
    }, [hasError, bot, p.code]);

    function send() {
      var body = text.trim();
      if (!body) return;
      if (body.length > 500) return showToast("Max 500 characters");
      var u = me();
      if (u.id === "anon") return showToast("Can't read your account");
      var idn = identity();
      setBusy(true);
      rpc("add_comment", { p_script: String(p.scriptId), p_user: u.id, p_name: idn.name, p_avatar: idn.avatar, p_body: body })
        .then(function () { setText(""); setTick(function (n) { return n + 1; }); })
        .catch(errToast).then(function () { setBusy(false); });
    }
    function del(c) {
      confirmBox("Delete comment?", "This can't be undone.", function () {
        rpc("delete_comment", { p_id: c.id, p_user: me().id, p_token: p.token || null })
          .then(function () { setTick(function (n) { return n + 1; }); }).catch(errToast);
      });
    }
    function allow(c) {
      confirmBox("Allow editing?", "This person will be able to change the public version of your script. You can remove them later in My scripts \u2192 Collaboration.", function () {
        rpc("grant_editor_from_comment", { p_comment: c.id, p_token: p.token })
          .then(function () { showToast("They can now edit this script"); setTick(function (n) { return n + 1; }); })
          .catch(errToast);
      });
    }
    function idea(c) {
      confirmBox("Add idea to your script?",
        "It is appended to your local copy as comments (or as code if the idea has a ``` block). Read it in My scripts and press Save to publish. Never save code you don't understand.",
        function () { p.onApplyIdea(ideaBlock(c.body, c.author_name), c.author_name); });
    }

    function row(c) {
      var isErr = hasTag(c.body, "error"), isIdea = hasTag(c.body, "idea");
      var canDel = c.mine || !!p.token;
      var canGrant = !!p.token && !c.is_owner && !c.is_editor && !c.mine;
      var acts = [];
      if (isIdea && p.onApplyIdea && p.token) acts.push(Btn("Add to script", function () { idea(c); }, C.green, false, "i"));
      if (canGrant) acts.push(Btn("Allow editing", function () { allow(c); }, C.card, false, "g"));
      if (canDel) acts.push(Btn("Delete", function () { del(c); }, C.card, false, "d"));
      return h(View, { key: String(c.id), style: { flexDirection: "row", marginBottom: 12 } },
        Avatar(c.author_avatar, c.author_name, 30),
        h(View, { style: { flex: 1 } },
          h(View, { style: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" } },
            h(Text, { style: { color: C.text, fontWeight: "700" } }, c.author_name),
            c.is_owner ? Badge("OWNER", C.green) : null,
            c.is_editor ? Badge("EDITOR", "#5865f2") : null,
            isIdea ? Badge("IDEA", "#b58900") : null,
            isErr ? Badge("ERROR", C.danger) : null,
            h(Text, { style: { color: C.sub, fontSize: 11, marginLeft: 6 } }, timeAgo(c.created_at))),
          h(Text, { selectable: true, style: { color: C.text, marginTop: 2 } }, c.body),
          acts.length ? h(View, { style: { flexDirection: "row", flexWrap: "wrap" } }, acts) : null,
          isErr ? h(View, { style: { backgroundColor: C.bot, borderRadius: 10, padding: 10, marginTop: 8 } },
            h(Text, { style: { color: C.info, fontWeight: "700", marginBottom: 4 } }, "\uD83E\uDD16 Script check"),
            h(Text, { selectable: true, style: { color: C.text, fontSize: 12 } }, bot === null ? "Checking the script\u2026" : bot.join("\n"))) : null));
    }

    return h(View, { style: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 } },
      h(Text, { style: { color: C.text, fontWeight: "700", marginBottom: 4 } }, "Comments"),
      h(Text, { style: { color: C.sub, fontSize: 11, marginBottom: 10 } }, "@error = check this script for errors \u00B7 @idea = suggest an idea to the owner"),
      loading && list.length === 0 && h(Text, { style: { color: C.sub, marginBottom: 8 } }, "Loading..."),
      err && h(Text, { style: { color: C.danger, marginBottom: 8 } }, err),
      !loading && !err && list.length === 0 && h(Text, { style: { color: C.sub, marginBottom: 8 } }, "No comments yet."),
      list.map(row),
      Area(text, setText, "Write a comment...", 60),
      h(Text, { style: { color: C.sub, fontSize: 11 } }, text.length + "/500" + (cfg("anonymous") ? " \u00B7 posting as Anonymous" : "")),
      h(View, { style: { flexDirection: "row" } }, Btn("Send", send, null, busy || !text.trim()), Btn("Reload", function () { setTick(function (n) { return n + 1; }); }, C.card))
    );
  }

  // ---------- Explore (market) ----------
  function EditorBox(p) {
    var it = p.it;
    var n = React.useState(it.name), name = n[0], setName = n[1];
    var d = React.useState(it.description || ""), desc = d[0], setDesc = d[1];
    var im = React.useState(it.image_url || ""), img = im[0], setImg = im[1];
    var c = React.useState(p.code), code = c[0], setCode = c[1];
    var b = React.useState(false), busy = b[0], setBusy = b[1];
    function save() {
      var u = me();
      if (u.id === "anon") return showToast("Can't read your account");
      setBusy(true);
      rpc("editor_update_script", {
        p_script: String(it.id), p_user: u.id, p_name: name.trim() || "Untitled",
        p_description: desc.trim(), p_image: img.trim(), p_code: code
      }).then(function () { showToast("Saved to the market"); p.onSaved(); })
        .catch(errToast).then(function () { setBusy(false); });
    }
    return h(View, { style: { marginBottom: 10 } },
      h(Text, { style: { color: C.warn, fontSize: 12, marginBottom: 6 } }, "You can edit this script because the owner allowed it. Changes go live in the market."),
      Field(name, setName, "Script name"),
      Area(desc, setDesc, "Description", 60),
      Field(img, setImg, "Image link (https://...)"),
      Area(code, setCode, "// JavaScript code", 160, true),
      Btn("Save to market", save, null, busy));
  }

  function MarketCard(p) {
    var it = p.it, ex = p.extra || {};
    var o = React.useState(false), open = o[0], setOpen = o[1];
    var c = React.useState(null), code = c[0], setCode = c[1];
    var ed = React.useState(false), editing = ed[0], setEditing = ed[1];
    var author = ex.display_name || it.author_name || "?";
    var owned = ownedLocal(it.id);

    function loadCode() {
      if (code !== null) return;
      sb("public_scripts?id=eq." + it.id + "&select=code")
        .then(function (r) { setCode(r && r[0] ? r[0].code : "(unavailable)"); }).catch(errToast);
    }
    function toggle() { var next = !open; setOpen(next); if (next) loadCode(); }
    function applyIdea(block) {
      var local = ownedLocal(it.id);
      if (!local) return showToast("Open this script from My scripts");
      update(local.id, { code: appendCode(local.code, block) });
      showToast("Idea added. Review it in My scripts, then Save");
    }

    return h(View, { style: card() },
      Cover(it.image_url, 150),
      h(Press, { onPress: toggle },
        h(View, { style: { flexDirection: "row", alignItems: "center" } },
          Avatar(ex.avatar, author, 32),
          h(View, { style: { flex: 1 } },
            h(Text, { style: { color: C.text, fontSize: 17, fontWeight: "700" } }, it.name),
            h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, "by " + author))),
        h(Text, { numberOfLines: open ? undefined : 3, style: { color: C.sub, marginTop: 6 } }, it.description || "No description")),
      h(View, { style: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 10 } },
        h(Press, { onPress: function () { p.onLike(it); }, style: { flexDirection: "row", alignItems: "center", marginRight: 14 } },
          h(Text, { style: { color: p.liked ? C.heart : C.sub, fontSize: 16 } }, p.liked ? "\u2665" : "\u2661"),
          h(Text, { style: { color: C.sub, marginLeft: 4 } }, String(it.likes))),
        h(Text, { style: { color: C.sub, marginRight: 14 } }, "\uD83D\uDCAC " + (ex.comments || 0)),
        h(Text, { style: { color: C.sub, flex: 1 } }, "\u2193 " + it.installs),
        p.canEdit ? Btn("Edit", function () { setOpen(true); loadCode(); setEditing(!editing); }, C.card) : null,
        p.installed ? h(Text, { style: { color: C.sub, fontWeight: "600" } }, "Installed") : Btn("Install", function () { p.onInstall(it); })),
      open && h(View, { style: { marginTop: 10 } },
        editing && code !== null ? h(EditorBox, { it: it, code: code, onSaved: function () { setEditing(false); setCode(null); p.onChanged(); } }) : null,
        h(View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
          h(Text, { style: { color: C.sub, fontSize: 12 } }, "Code:"),
          code !== null ? Btn("Copy", function () { showToast(copy(code) ? "Copied" : "Can't copy here"); }, C.input) : null),
        h(ScrollView, { nestedScrollEnabled: true, style: { maxHeight: 220, backgroundColor: C.input, borderRadius: 10, padding: 10, marginTop: 4 } },
          h(Text, { selectable: true, style: { color: C.text, fontFamily: "monospace", fontSize: cfg("codeSize") } }, code === null ? "Loading..." : code)),
        h(Comments, { scriptId: it.id, code: code, token: owned ? owned.token : null, onApplyIdea: owned ? applyIdea : null }))
    );
  }

  function Explore() {
    var qs = React.useState(""), q = qs[0], setQ = qs[1];
    var ss = React.useState("new"), sort = ss[0], setSort = ss[1];
    var is = React.useState([]), items = is[0], setItems = is[1];
    var ls = React.useState(false), loading = ls[0], setLoading = ls[1];
    var es = React.useState(null), err = es[0], setErr = es[1];
    var lk = React.useState({}), liked = lk[0], setLiked = lk[1];
    var ts = React.useState(0), tick = ts[0], setTick = ts[1];
    var xs = React.useState({}), extras = xs[0], setExtras = xs[1];
    var lb = React.useState(false), likeBusy = lb[0], setLikeBusy = lb[1];

    React.useEffect(function () {
      if (!configured) return;
      var dead = false;
      var t = setTimeout(function () {
        setLoading(true); setErr(null);
        loadScripts(q.trim(), sort)
          .then(function (rows) {
            if (dead) return;
            rows = rows || [];
            setItems(rows);
            if (!rows.length) return;
            // avatars, comment counts, edit rights (needs setup_v4.sql; the list works without it)
            return rpc("script_extras", { p_ids: rows.map(function (r) { return String(r.id); }), p_user: me().id })
              .then(function (ex) {
                if (dead) return;
                var m = {};
                (ex || []).forEach(function (x) { m[x.script_id] = x; });
                setExtras(m);
              }).catch(function () {});
          })
          .catch(function (e) { if (!dead) setErr(e.message || String(e)); })
          .then(function () { if (!dead) setLoading(false); });
      }, 350);
      return function () { dead = true; clearTimeout(t); };
    }, [q, sort, tick]);

    React.useEffect(function () {
      if (!configured) return;
      var u = me();
      if (u.id === "anon") return;
      rpc("my_likes", { p_user: u.id }).then(function (ids) {
        var m = {};
        (ids || []).forEach(function (i) { m[i] = true; });
        setLiked(m);
      }).catch(function () {});
    }, [tick]);

    function patchItem(id, f) {
      setItems(function (cur) { return cur.map(function (x) { return x.id === id ? Object.assign({}, x, f) : x; }); });
    }
    function onLike(it) {
      var u = me();
      if (u.id === "anon") return showToast("Can't read your account");
      if (likeBusy) return;
      setLikeBusy(true);
      rpc("toggle_like", { p_script: it.id, p_user: u.id }).then(function (n) {
        setLiked(function (cur) { var m = Object.assign({}, cur); m[it.id] = !cur[it.id]; return m; });
        if (typeof n === "number") patchItem(it.id, { likes: n });
      }).catch(errToast).then(function () { setLikeBusy(false); });
    }
    function onInstall(it) {
      var u = me();
      if ((storage.scripts || []).some(function (s) { return s.fromMarket && s.remoteId === it.id; })) return showToast("Already installed");
      sb("public_scripts?id=eq." + it.id + "&select=code").then(function (rows) {
        if (!rows || !rows[0]) throw new Error("Script no longer exists");
        var ex = extras[String(it.id)] || {};
        storage.scripts = (storage.scripts || []).concat([{
          id: "m" + it.id, remoteId: it.id, fromMarket: true, name: it.name, description: it.description || "",
          image: it.image_url || "", author: ex.display_name || it.author_name, code: rows[0].code, enabled: false
        }]);
        showToast("Installed. Enable it in My scripts");
        return u.id === "anon" ? null : rpc("add_install", { p_script: it.id, p_user: u.id });
      }).then(function (n) {
        if (typeof n === "number") patchItem(it.id, { installs: n });
      }).catch(errToast);
    }

    var installedIds = {};
    (storage.scripts || []).forEach(function (s) { if (s.fromMarket && s.remoteId) installedIds[s.remoteId] = true; });

    if (!configured) {
      return h(ScrollView, { contentContainerStyle: { padding: 12 } },
        h(Text, { style: { color: C.text, fontSize: 16, fontWeight: "700" } }, "Market not configured"),
        h(Text, { style: { color: C.sub, marginTop: 6 } }, "Set SUPABASE_URL and SUPABASE_KEY in index.js, then publish the plugin again."));
    }

    return h(ScrollView, { contentContainerStyle: { padding: 12 }, keyboardShouldPersistTaps: "handled" },
      Field(q, setQ, "Search by name...", { style: { borderRadius: 24, paddingHorizontal: 16 } }),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
        Pill("Newest", sort === "new", function () { setSort("new"); }),
        Pill("Oldest", sort === "oldest", function () { setSort("oldest"); }),
        Pill("Most liked", sort === "liked", function () { setSort("liked"); })),
      h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 12 } }, "\u26A0 " + WARN),
      loading && h(Text, { style: { color: C.sub, marginBottom: 8 } }, "Loading..."),
      err && h(Text, { style: { color: C.danger, marginBottom: 8 } }, err),
      !loading && !err && items.length === 0 && h(Text, { style: { color: C.sub } }, "No scripts found."),
      items.map(function (it) {
        var ex = extras[String(it.id)];
        return h(MarketCard, {
          key: it.id, it: it, extra: ex, liked: !!liked[it.id], installed: !!installedIds[it.id],
          canEdit: !!(ex && ex.can_edit), onLike: onLike, onInstall: onInstall,
          onChanged: function () { setTick(function (n) { return n + 1; }); }
        });
      }),
      Btn("Refresh", function () { setTick(tick + 1); }, C.card)
    );
  }

  // ---------- My scripts ----------
  function Collab(p) {
    var s = p.s;
    var es = React.useState([]), editors = es[0], setEditors = es[1];
    var us = React.useState(""), uid = us[0], setUid = us[1];
    var bz = React.useState(false), busy = bz[0], setBusy = bz[1];
    var tk = React.useState(0), tick = tk[0], setTick = tk[1];

    React.useEffect(function () {
      if (!s.claimed) return;
      var dead = false;
      rpc("list_editors", { p_script: String(s.remoteId) })
        .then(function (rows) { if (!dead) setEditors(rows || []); }).catch(function () {});
      return function () { dead = true; };
    }, [s.claimed, tick]);

    function enable() {
      setBusy(true);
      claimOwner(s).then(function () { showToast("Collaboration is on"); })
        .catch(errToast).then(function () { setBusy(false); });
    }
    function allow() {
      var id = uid.trim();
      if (!/^\d{15,22}$/.test(id)) return showToast("Enter a Discord user ID (numbers only)");
      var US = findByStoreName("UserStore");
      var u = US && US.getUser && US.getUser(id);
      var nm = u ? (u.globalName || u.username || "User") : "User " + id.slice(-4);
      setBusy(true);
      rpc("grant_editor", { p_script: String(s.remoteId), p_token: s.token, p_user: id, p_name: nm, p_avatar: u ? avatarOf(u) : "" })
        .then(function () { setUid(""); setTick(function (n) { return n + 1; }); showToast(nm + " can now edit"); })
        .catch(errToast).then(function () { setBusy(false); });
    }
    function remove(e) {
      rpc("revoke_editor", { p_script: String(s.remoteId), p_token: s.token, p_eid: e.id })
        .then(function () { setTick(function (n) { return n + 1; }); }).catch(errToast);
    }

    return h(View, { style: { marginTop: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 } },
      h(Text, { style: { color: C.text, fontWeight: "700" } }, "Collaboration"),
      !s.claimed
        ? h(View, null,
          h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 4 } }, "Let other people edit the public version of this script. Turning it on re-saves your current saved version to the market."),
          Btn("Turn on", enable, null, busy))
        : h(View, null,
          h(Text, { style: { color: C.sub, fontSize: 12, marginVertical: 4 } }, "Tip: you can also press \u201CAllow editing\u201D under someone's comment."),
          editors.length === 0 ? h(Text, { style: { color: C.sub, marginBottom: 6 } }, "No collaborators yet.") : null,
          editors.map(function (e) {
            return h(View, { key: String(e.id), style: { flexDirection: "row", alignItems: "center", marginBottom: 6 } },
              Avatar(e.user_avatar, e.user_name, 26),
              h(Text, { style: { color: C.text, flex: 1 } }, e.user_name),
              Btn("Remove", function () { remove(e); }, C.card));
          }),
          Field(uid, setUid, "Discord user ID", { props: { keyboardType: "numeric" } }),
          h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
            Btn("Allow editing", allow, null, busy || !uid.trim()),
            Btn("Pull latest", p.onPull, C.card))));
  }

  function ScriptCard(p) {
    var s = p.s;
    var o = React.useState(false), open = o[0], setOpen = o[1];
    var n = React.useState(s.name), name = n[0], setName = n[1];
    var d = React.useState(s.description || ""), desc = d[0], setDesc = d[1];
    var im = React.useState(s.image || ""), img = im[0], setImg = im[1];
    var c = React.useState(s.code), code = c[0], setCode = c[1];
    var st = React.useState(null), stats = st[0], setStats = st[1];
    var b = React.useState(false), busy = b[0], setBusy = b[1];
    var sc = React.useState(false), showC = sc[0], setShowC = sc[1];
    var own = !!(s.isPublic && s.remoteId && !s.fromMarket);

    React.useEffect(function () {
      if (!configured || !own) return;
      sb("public_scripts?id=eq." + s.remoteId + "&select=likes,installs").then(function (r) { if (r && r[0]) setStats(r[0]); }).catch(function () {});
    }, [s.remoteId, s.isPublic]);

    function fields() { return { name: name.trim() || "Untitled", description: desc.trim(), image: img.trim(), code: code }; }
    function saveLocal() {
      var f = fields();
      update(s.id, { name: f.name, description: f.description, image: f.image, code: f.code });
      return f;
    }
    function save() {
      var f = saveLocal();
      if (s.enabled) start(Object.assign({}, s, { name: f.name, code: f.code }));
      if (own) {
        rpc("update_script", { p_id: s.remoteId, p_token: s.token, p_name: f.name, p_description: f.description, p_image: f.image, p_code: f.code })
          .then(function () { showToast("Saved and updated in the market"); }).catch(errToast);
      } else showToast("Saved");
    }
    function setPublic(v) {
      if (busy) return;
      setBusy(true);
      if (v) {
        var u = me();
        if (u.id === "anon") { setBusy(false); return showToast("Can't read your account"); }
        var idn = identity();
        var f = saveLocal();
        var token = s.token || makeToken();
        rpc("publish_script", { p_name: f.name, p_description: f.description, p_image: f.image, p_code: f.code, p_author_id: u.id, p_author_name: idn.name, p_token: token })
          .then(function (id) {
            update(s.id, { remoteId: id, token: token, isPublic: true, claimed: false });
            showToast("Published as " + idn.name);
            // best effort: enables avatar + collaboration (needs setup_v4.sql)
            return claimOwner(Object.assign({}, s, { remoteId: id, token: token, name: f.name, description: f.description, image: f.image, code: f.code }))
              .catch(function () {});
          })
          .catch(errToast).then(function () { setBusy(false); });
      } else {
        var go = function () {
          return rpc("unpublish_script", { p_id: s.remoteId, p_token: s.token })
            .then(function () { update(s.id, { isPublic: false, remoteId: null, token: null, claimed: false }); setStats(null); showToast("Now private"); });
        };
        (s.claimed ? rpc("drop_script_data", { p_script: String(s.remoteId), p_token: s.token }).catch(function () {}) : Promise.resolve())
          .then(go).catch(errToast).then(function () { setBusy(false); });
      }
    }
    function toggleEnable(v) {
      var go = function () {
        var f = saveLocal(); // run exactly what is saved (the old version ran unsaved edits)
        update(s.id, { enabled: v });
        if (v) start(Object.assign({}, s, { name: f.name, code: f.code })); else stop(s.id);
      };
      if (v && s.fromMarket && cfg("confirmEnable")) confirmBox("Enable this script?", "This script was written by " + (s.author || "someone else") + ". " + WARN, go);
      else go();
    }
    function remove() {
      var removeLocal = function () {
        stop(s.id);
        storage.scripts = (storage.scripts || []).filter(function (x) { return x.id !== s.id; });
      };
      confirmBox("Delete this script?", own ? "It will also be removed from the market (comments included)." : "It will only be deleted from this phone.", function () {
        if (!own || !s.token) return removeLocal();
        (s.claimed ? rpc("drop_script_data", { p_script: String(s.remoteId), p_token: s.token }).catch(function () {}) : Promise.resolve())
          .then(function () { return rpc("unpublish_script", { p_id: s.remoteId, p_token: s.token }); })
          .then(removeLocal)
          .catch(function (e) { showToast("Not deleted: " + (e && e.message ? e.message : e)); });
      });
    }
    function pull() {
      sb("public_scripts?id=eq." + s.remoteId + "&select=name,description,image_url,code").then(function (r) {
        if (!r || !r[0]) throw new Error("Script no longer exists");
        var row = r[0];
        setName(row.name); setDesc(row.description || ""); setImg(row.image_url || ""); setCode(row.code);
        update(s.id, { name: row.name, description: row.description || "", image: row.image_url || "", code: row.code });
        showToast("Pulled the latest version");
      }).catch(errToast);
    }
    function applyIdea(block) {
      setCode(function (cur) { return appendCode(cur, block); });
      showToast("Idea added below your code. Review it, then Save");
    }

    var sub = s.fromMarket ? "Installed from the market \u00B7 by " + (s.author || "?")
      : s.isPublic ? "Public" + (stats ? " \u00B7 \u2665 " + stats.likes + " \u00B7 \u2193 " + stats.installs + " installs" : "")
      : "Private";

    return h(View, { style: card() },
      h(View, { style: { flexDirection: "row", alignItems: "center" } },
        h(Press, { style: { flex: 1 }, onPress: function () { setOpen(!open); } },
          h(Text, { style: { color: C.text, fontSize: 16, fontWeight: "700" } }, (open ? "\u25BE " : "\u25B8 ") + s.name),
          h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, sub)),
        h(Switch, { value: !!s.enabled, onValueChange: toggleEnable })),
      open && h(View, { style: { marginTop: 12 } },
        Cover(img, 140),
        Field(name, setName, "Script name"),
        Area(desc, setDesc, "Description: what the script does", 70),
        Field(img, setImg, "Image link (https://...)"),
        Area(code, setCode, "// JavaScript code", 180, true),
        !s.fromMarket && h(View, { style: { flexDirection: "row", alignItems: "center", marginVertical: 6 } },
          h(View, { style: { flex: 1 } },
            h(Text, { style: { color: C.text, fontWeight: "600" } }, s.isPublic ? "Public" : "Private"),
            h(Text, { style: { color: C.sub, fontSize: 12 } }, "Public = listed in Explore" + (cfg("anonymous") ? ", as Anonymous" : ", under your name"))),
          h(Switch, { value: !!s.isPublic, onValueChange: setPublic, disabled: busy })),
        h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          Btn("Save", save),
          Btn("Run", function () { var f = saveLocal(); start(Object.assign({}, s, { name: f.name, code: f.code })); }, C.green),
          Btn("Copy", function () { showToast(copy(code) ? "Copied" : "Can't copy here"); }, C.card),
          own ? Btn(showC ? "Hide comments" : "Comments", function () { setShowC(!showC); }, C.card) : null,
          Btn("Delete", remove, C.danger)),
        own ? h(Collab, { s: s, onPull: pull }) : null,
        own && showC ? h(Comments, { scriptId: s.remoteId, code: s.code, token: s.token, onApplyIdea: applyIdea }) : null)
    );
  }

  function Mine() {
    useProxy(storage);
    ensure();
    return h(ScrollView, { contentContainerStyle: { padding: 12 }, keyboardShouldPersistTaps: "handled" },
      h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 12 } },
        "In your code: vendetta, revenge (ui, storage, events, modules, discord, navigation, browser, device, patcher), React, ReactNative, findByName, findByProps, findByStoreName, patch, patchComponent, cleanup, toast, log, console. A script may return a function that runs when it stops. Open the Terminal tab and type api() for details."),
      (storage.scripts || []).map(function (s) { return h(ScriptCard, { key: s.id, s: s }); }),
      Btn("+ New script", function () {
        storage.scripts = (storage.scripts || []).concat([{ id: "s" + Date.now(), name: "New script", description: "", image: "", code: "// write your code here\n", enabled: false }]);
      })
    );
  }

  // ---------- Terminal ----------
  var termVars = {}, termScratch = {}, termCleanups = [], termLast, termApiObj = null, memHistory = [];
  var termCtx = { name: "", script: null };
  var HELP = [
    "Scripts terminal v" + VERSION + ". Type JavaScript and press Run. await works.",
    "var/let/const/function declarations stay for the session. $ is a scratch object, _ is the last result.",
    "Commands: help() clear() scripts() run(n|name) stop(n|name) api() grep(obj, text) keys(obj) inspect(obj, depth) copy(x) sleep(ms) unpatch()",
    "Globals: vendetta, revenge.{ui,storage,events,modules,discord,navigation,browser,device,patcher}, React, ReactNative, findByName, findByProps, findByStoreName, patch, patchComponent, cleanup, toast, log, plugin",
    "Try: revenge.device.os  |  toast('hi')  |  grep(revenge.ui, 'toast')  |  await revenge.browser.fetchJSON('https://api.github.com')"
  ];
  function termClear() {
    termLines.length = 0;
    termSubs.slice().forEach(function (f) { try { f(); } catch (e) {} });
  }
  function findScript(x) {
    var list = storage.scripts || [];
    if (typeof x === "number") return list[x - 1];
    var q = String(x).toLowerCase(), i;
    for (i = 0; i < list.length; i++) if (list[i].id === x || String(list[i].name).toLowerCase() === q) return list[i];
    for (i = 0; i < list.length; i++) if (String(list[i].name).toLowerCase().indexOf(q) >= 0) return list[i];
    return undefined;
  }
  function termApi() {
    if (termApiObj) return termApiObj;
    var a = makeApi(termCleanups, termCtx);
    a.$ = termScratch;
    a._ = undefined;
    a.plugin = storage;
    a.help = function () { HELP.forEach(function (l) { termLog("info", l); }); };
    a.clear = termClear;
    a.scripts = function () {
      var list = storage.scripts || [];
      if (!list.length) return termLog("dim", "(no scripts)");
      list.forEach(function (s, i) {
        termLog("out", (i + 1) + ". " + s.name + "  [" + (running[s.id] ? "running" : "stopped") + (s.isPublic ? ", public" : "") + (s.fromMarket ? ", market" : "") + "]");
      });
    };
    a.run = function (x) {
      var s = findScript(x);
      if (!s) return termLog("warn", "No script: " + show(x));
      start(s);
      termLog("info", "\u25B6 " + s.name);
    };
    a.stop = function (x) {
      var s = findScript(x);
      if (!s) return termLog("warn", "No script: " + show(x));
      stop(s.id);
      termLog("info", "\u25A0 " + s.name);
    };
    a.api = function () {
      NS_NAMES.forEach(function (n) {
        var ns = a.revenge[n];
        termLog("info", "revenge." + n + "  [" + (nativeNs(n) ? "native + fallback" : "fallback") + "]");
        termLog("dim", Object.keys(ns).filter(function (k) { return k !== "native"; }).join(", "));
      });
      termLog("dim", "global revenge object: " + (G.revenge ? "found (members win over fallbacks)" : "not found (everything comes from the vendetta layer)"));
    };
    a.grep = function (obj, text) {
      var out = [], q = String(text).toLowerCase();
      try { for (var k in obj) if (k.toLowerCase().indexOf(q) >= 0) out.push(k); } catch (e) {}
      termLog(out.length ? "out" : "dim", out.length ? out.slice(0, 80).join(", ") : "(nothing)");
    };
    a.keys = function (obj) {
      var ks = [];
      try { ks = Object.getOwnPropertyNames(Object(obj)); } catch (e) {}
      termLog("out", ks.length ? ks.join(", ") : "(none)");
    };
    a.inspect = function (obj, depth) { termLog("out", show(obj, depth === undefined ? 3 : depth)); };
    a.copy = function (x) {
      var ok = copy(typeof x === "string" ? x : show(x, 4));
      termLog(ok ? "dim" : "warn", ok ? "copied" : "clipboard not available");
    };
    a.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    a.unpatch = function () {
      var n = termCleanups.length;
      termCleanups.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
      termLog("info", "removed " + n + " patch(es)/listener(s) made from the terminal");
    };
    return (termApiObj = a);
  }
  function canParse(src) { try { new Function(src); return true; } catch (e) { return false; } }
  function declaredNames(code) {
    var out = [], m, i, res = [
      /(?:^|[;\n{])[ \t]*(?:var|let|const)[ \t]+([A-Za-z_$][\w$]*)/g,
      /(?:^|[;\n{])[ \t]*(?:async[ \t]+)?function[ \t]*\*?[ \t]*([A-Za-z_$][\w$]*)/g,
      /(?:^|[;\n{])[ \t]*class[ \t]+([A-Za-z_$][\w$]*)/g
    ];
    for (i = 0; i < res.length; i++) while ((m = res[i].exec(code))) out.push(m[1]);
    return out;
  }
  function termSave(getter, names) {
    names.forEach(function (n) { try { termVars[n] = getter(n); } catch (e) {} });
  }
  // runs `code` with the script API as local names; resolves {value, expr}
  function termRun(code) {
    try {
      var a = termApi();
      a._ = termLast;
      var argNames = Object.keys(a);
      var known = Object.keys(termVars);
      var decl = declaredNames(code).filter(function (n, i, arr) {
        return known.indexOf(n) < 0 && argNames.indexOf(n) < 0 && arr.indexOf(n) === i;
      });
      var names = known.concat(decl);
      var wantAsync = /\bawait\b/.test(code);
      if (wantAsync && !ASYNC_OK) return Promise.reject(new Error("await isn't supported on this runtime"));
      var save = "__sv(function(n){return eval(n)}," + JSON.stringify(names) + ")";
      var isDecl = /^\s*(?:async\s+)?function\s*\*?\s*[A-Za-z_$]|^\s*class\s+[A-Za-z_$]/.test(code);
      var isExpr = !isDecl && canParse(wantAsync ? "return async function(){ return (" + code + "\n) }" : "return (" + code + "\n)");
      if (!isExpr) {
        // report the user's own syntax error, not one caused by the code the terminal appends
        try { new Function(wantAsync ? "return async function(){\n" + code + "\n}" : code); }
        catch (e) { return Promise.reject(e); }
      }
      var src;
      if (wantAsync) {
        src = isExpr
          ? "(async function(){ var __r = (" + code + "\n); " + save + "; return __r; })()"
          : "(async function(){\n" + code + "\n;" + save + ";\n})()";
      } else {
        src = isExpr
          ? "(function(){ var __r = (" + code + "\n); " + save + "; return __r; })()"
          : code + "\n;" + save + ";";
      }
      var pre = known.map(function (n) { return "var " + n + " = __vars[" + JSON.stringify(n) + "];"; }).join("\n");
      var fn = new Function("__vars", "__code", "__sv", argNames.join(","), pre + "\nreturn eval(__code);");
      var res = fn.apply(null, [termVars, src, termSave].concat(argNames.map(function (k) { return a[k]; })));
      return Promise.resolve(res).then(function (v) { return { value: v, expr: isExpr }; });
    } catch (e) { return Promise.reject(e); }
  }
  function termExec(code) {
    var before = termSeq;
    termRun(code).then(function (r) {
      if (r.value === undefined && termSeq > before) return;
      if (r.expr || r.value !== undefined) {
        termLast = r.value;
        termLog(r.value === undefined ? "dim" : "out", show(r.value));
      }
    }, function (e) { termLog("err", fmt(e, 1, [], true)); });
  }
  function getHist() { return cfg("termHistory") ? (storage.termHistory || []) : memHistory; }
  function pushHist(code) {
    var arr = getHist().slice();
    if (arr[arr.length - 1] === code) return;
    arr.push(code);
    if (arr.length > 50) arr = arr.slice(arr.length - 50);
    if (cfg("termHistory")) storage.termHistory = arr; else memHistory = arr;
  }
  var CHIPS = ["help", "api()", "scripts()", "revenge.", "vendetta.", "findByProps(", "findByName(", "toast(", "await ", "=> ", "() ", "{ }", "[]", "\"\"", ";"];
  var LINE_COLOR = { "in": "#ffffff", out: C.text, log: C.text, info: C.info, warn: C.warn, err: C.danger, dim: C.sub };

  function Terminal() {
    useProxy(storage);
    var fs = React.useState(0), force = fs[1];
    var is = React.useState(""), input = is[0], setInput = is[1];
    var hs = React.useState(-1), hIdx = hs[0], setHIdx = hs[1];
    var ref = React.useRef(null);

    React.useEffect(function () {
      var f = function () { force(function (n) { return n + 1; }); };
      termSubs.push(f);
      if (termLines.length === 0) termLog("info", "Scripts terminal v" + VERSION + ". Type help");
      return function () { termSubs = termSubs.filter(function (x) { return x !== f; }); };
    }, []);

    function submit() {
      var code = input.trim();
      if (!code) return;
      setInput(""); setHIdx(-1);
      pushHist(code);
      termLog("in", "\u276F " + code);
      termExec(/^(help|clear|scripts|api|unpatch)$/.test(code) ? code + "()" : code);
    }
    function older() {
      var arr = getHist();
      if (!arr.length) return;
      var i = Math.min(arr.length - 1, hIdx + 1);
      setHIdx(i); setInput(arr[arr.length - 1 - i]);
    }
    function newer() {
      var arr = getHist();
      if (hIdx <= 0) { setHIdx(-1); setInput(""); return; }
      var i = hIdx - 1;
      setHIdx(i); setInput(arr[arr.length - 1 - i]);
    }

    return h(View, { style: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 } },
      h(View, { style: { flexDirection: "row", alignItems: "center" } },
        h(Text, { style: { color: C.sub, flex: 1, fontSize: 12 } }, "JavaScript runs inside the app. Be careful what you paste."),
        Btn("Copy log", function () {
          showToast(copy(termLines.map(function (l) { return l.t; }).join("\n")) ? "Copied" : "Can't copy here");
        }, C.card),
        Btn("Clear", termClear, C.card)),
      h(ScrollView, {
        ref: ref, nestedScrollEnabled: true, keyboardShouldPersistTaps: "handled",
        style: { flex: 1, backgroundColor: "#111214", borderRadius: 12, padding: 10, marginTop: 4 },
        onContentSizeChange: function () { if (ref.current && ref.current.scrollToEnd) ref.current.scrollToEnd({ animated: false }); }
      }, termLines.slice(-150).map(function (l) {
        return h(Text, { key: String(l.id), selectable: true, style: { color: LINE_COLOR[l.k] || C.text, fontFamily: "monospace", fontSize: cfg("codeSize"), marginBottom: 3 } }, l.t);
      })),
      h(ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, keyboardShouldPersistTaps: "handled", style: { flexGrow: 0, marginTop: 6 } },
        CHIPS.map(function (t) {
          return h(Press, { key: t, onPress: function () { setInput(function (cur) { return cur + t; }); }, style: { backgroundColor: C.card, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10, marginRight: 6 } },
            h(Text, { style: { color: C.sub, fontFamily: "monospace", fontSize: 12 } }, t));
        })),
      h(View, { style: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 } },
        h(TextInput, {
          value: input, onChangeText: setInput, placeholder: "type code, e.g. revenge.device.os", placeholderTextColor: C.sub,
          autoCapitalize: "none", autoCorrect: false, spellCheck: false, multiline: true,
          style: { flex: 1, maxHeight: 120, backgroundColor: C.input, color: C.text, borderRadius: 12, padding: 10, fontFamily: "monospace", fontSize: cfg("codeSize") }
        }),
        h(View, { style: { alignItems: "flex-end" } },
          h(View, { style: { flexDirection: "row" } }, Btn("\u25B2", older, C.card), Btn("\u25BC", newer, C.card)),
          Btn("Run", submit, null, !input.trim())))
    );
  }

  // ---------- Settings ----------
  function SettingsTab() {
    useProxy(storage);
    ensure();
    var cur = cfg("btnColor");
    function Head(t) { return h(Text, { key: "h" + t, style: { color: C.text, fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 10 } }, t); }
    function Row(title, sub, key, after) {
      return h(View, { key: key, style: { flexDirection: "row", alignItems: "center", marginBottom: 14 } },
        h(View, { style: { flex: 1, paddingRight: 10 } },
          h(Text, { style: { color: C.text, fontWeight: "600" } }, title),
          sub ? h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, sub) : null),
        h(Switch, { value: !!cfg(key), onValueChange: function (v) { setCfg(key, v); if (after) after(v); } }));
    }
    return h(ScrollView, { contentContainerStyle: { padding: 12 } },
      Head("Appearance"),
      h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 8 } }, "Button color"),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
        BTN_LIST.map(function (b) {
          return h(Press, {
            key: b[0], onPress: function () { setCfg("btnColor", b[0]); },
            style: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: cur === b[0] ? (b[0] === "black" ? "#ffffff" : BTN[b[0]].bg) : "transparent" }
          },
            h(View, { style: { width: 16, height: 16, borderRadius: 8, backgroundColor: BTN[b[0]].bg, borderWidth: 1, borderColor: "#4e5058", marginRight: 8 } }),
            h(Text, { style: { color: C.text, fontWeight: "600", fontSize: 13 } }, b[1]));
        })),
      h(View, { style: { flexDirection: "row" } }, Btn("Preview button", function () { showToast("Looks good"); })),
      h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 14, marginBottom: 8 } }, "Code font size"),
      h(View, { style: { flexDirection: "row" } },
        [["Small", 11], ["Medium", 13], ["Large", 15]].map(function (o) {
          return Pill(o[0], cfg("codeSize") === o[1], function () { setCfg("codeSize", o[1]); });
        })),
      Row("Compact cards", "Smaller cards, no cover images", "compact"),
      Row("Show profile pictures", "Off = letter circles instead of avatars", "showAvatars"),

      Head("Privacy"),
      Row("Anonymous mode", "New scripts and comments show \u201CAnonymous\u201D with no picture. Older public scripts update after you turn on Collaboration for them.", "anonymous", function (v) {
        var n = syncIdentity();
        showToast(v ? "Anonymous mode on" : "Anonymous mode off" + (n ? " (updated " + n + " script" + (n > 1 ? "s" : "") + ")" : ""));
      }),
      Row("Report script errors", "When a published script fails on your phone, only its ID and the error text are sent, so @error can show them.", "reportErrors"),

      Head("Scripts"),
      Row("Run enabled scripts at startup", null, "autoRun"),
      Row("Confirm before enabling scripts by others", "Shows a warning each time you enable a market script.", "confirmEnable"),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
        Btn("Run enabled now", function () { (storage.scripts || []).forEach(function (s) { if (s.enabled) start(s); }); showToast("Started enabled scripts"); }, C.green),
        Btn("Stop all", function () { Object.keys(running).forEach(stop); showToast("Stopped all scripts"); }, C.card)),

      Head("Terminal"),
      Row("Keep command history", "Remembers your last 50 commands.", "termHistory"),
      h(View, { style: { flexDirection: "row" } },
        Btn("Clear history", function () { storage.termHistory = []; memHistory = []; showToast("History cleared"); }, C.card)),

      Head("Data"),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
        Btn("Copy my scripts (JSON)", function () {
          var out = (storage.scripts || []).filter(function (s) { return !s.fromMarket; })
            .map(function (s) { return { name: s.name, description: s.description, image: s.image, code: s.code }; });
          showToast(copy(JSON.stringify(out, null, 2)) ? "Copied (no secrets included)" : "Can't copy here");
        }, C.card),
        Btn("Reset settings", function () {
          confirmBox("Reset settings?", "Your scripts are not touched.", function () { storage.settings = Object.assign({}, DEFAULTS); });
        }, C.danger))
    );
  }

  // ---------- Credits ----------
  function Credits() {
    var feats = [
      "Userscripts with the full vendetta + revenge.* API",
      "Public market: publish, search, like, install",
      "Comments with @error and @idea",
      "Owner-approved collaborators",
      "Anonymous mode and profile pictures",
      "Built-in terminal"
    ];
    return h(ScrollView, { contentContainerStyle: { padding: 12 } },
      h(View, { style: card({ alignItems: "center", padding: 20 }) },
        h(Text, { style: { color: C.text, fontSize: 24, fontWeight: "800" } }, "Scripts"),
        h(Text, { style: { color: C.sub, marginTop: 2 } }, "version " + VERSION),
        h(Text, { style: { color: C.text, fontSize: 16, fontWeight: "700", marginTop: 16 } }, CREDIT)),
      h(View, { style: card() },
        h(Text, { style: { color: C.text, fontWeight: "700", marginBottom: 8 } }, "What's inside"),
        feats.map(function (f) { return h(Text, { key: f, style: { color: C.sub, marginBottom: 4 } }, "\u2022 " + f); })),
      h(View, { style: card() },
        h(Text, { style: { color: C.text, fontWeight: "700", marginBottom: 6 } }, "Stay safe"),
        h(Text, { style: { color: C.sub } }, WARN + " @error never runs a script: it only checks the syntax and shows errors users reported."))
    );
  }

  // ---------- root ----------
  function Root() {
    useProxy(storage);
    ensure();
    var t = React.useState("explore"), tab = t[0], setTab = t[1];
    var tabs = [["explore", "Explore"], ["mine", "My scripts"], ["terminal", "Terminal"], ["settings", "Settings"], ["credits", "Credits"]];
    var body = tab === "explore" ? h(Explore) : tab === "mine" ? h(Mine) : tab === "terminal" ? h(Terminal)
      : tab === "settings" ? h(SettingsTab) : h(Credits);
    return h(View, { style: { flex: 1 } },
      h(ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, style: { flexGrow: 0 }, contentContainerStyle: { paddingHorizontal: 12, paddingTop: 12 } },
        tabs.map(function (x) { return Pill(x[1], tab === x[0], function () { setTab(x[0]); }); })),
      body);
  }

  return {
    onLoad: function () {
      ensure();
      if (cfg("autoRun")) (storage.scripts || []).forEach(function (s) { if (s.enabled) start(s); });
    },
    onUnload: function () {
      Object.keys(running).forEach(stop);
      termCleanups.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
      termSubs = [];
    },
    settings: Root
  };
})()
