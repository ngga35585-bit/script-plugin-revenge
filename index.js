(function () {
  // === CONFIG: paste your Supabase values (Project Settings → API Keys) ===
  var SUPABASE_URL = "https://lwxquiuwughqzbausore.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eHF1aXV3dWdocXpiYXVzb3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzMyOTgsImV4cCI6MjEwNjc0OTI5OH0.U6JsNeNJAaG_Fx6uRMuxl1bGqZkFAZnmW4DSBKDeIFA";
  // =================================================================

  var configured = SUPABASE_URL.indexOf("YOUR-PROJECT") === -1 && SUPABASE_KEY.indexOf("YOUR-") === -1;

  var React = vendetta.metro.common.React;
  var RN = vendetta.metro.common.ReactNative;
  var View = RN.View, Text = RN.Text, TextInput = RN.TextInput, ScrollView = RN.ScrollView;
  var Switch = RN.Switch, Image = RN.Image;
  var Press = RN.Pressable || RN.TouchableOpacity;
  var storage = vendetta.plugin.storage;
  var useProxy = vendetta.storage.useProxy;
  var showToast = vendetta.ui.toasts.showToast;
  var alerts = vendetta.ui.alerts;
  var patcher = vendetta.patcher;
  var findByName = vendetta.metro.findByName;
  var findByProps = vendetta.metro.findByProps;
  var UserStore = vendetta.metro.findByStoreName ? vendetta.metro.findByStoreName("UserStore") : null;
  var h = React.createElement;

  var C = {
    card: "#2b2d31", input: "#1e1f22", text: "#f2f3f5", sub: "#b5bac1", accent: "#5865f2",
    green: "#248046", danger: "#da373c", heart: "#f23f43", line: "#3f4147"
  };

  var EXAMPLE =
    "// Example: toast on start\n" +
    "toast('My script works!');\n\n" +
    "// Styling: replace 'ComponentName' with a real component name\n" +
    "// patchComponent('ComponentName', { borderRadius: 24 });\n" +
    "// Move: patchComponent('ComponentName', { transform: [{ translateY: 10 }] });\n";

  // ---------- utils ----------
  function me() {
    var u = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
    return u ? { id: String(u.id), name: u.globalName || u.username || "anonymous" } : { id: "anon", name: "anonymous" };
  }
  function makeToken() {
    var t = "";
    for (var i = 0; i < 4; i++) t += Math.random().toString(36).slice(2);
    return t;
  }
  function errToast(e) { showToast(e && e.message ? e.message : String(e)); }
  function confirmBox(title, content, onConfirm) {
    if (alerts && alerts.showConfirmationAlert) {
      alerts.showConfirmationAlert({ title: title, content: content, confirmText: "Continue", cancelText: "Cancel", onConfirm: onConfirm });
    } else onConfirm();
  }

  function sb(path, opts) {
    opts = opts || {};
    return fetch(SUPABASE_URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: SUPABASE_KEY.indexOf("sb_") === 0
        ? { apikey: SUPABASE_KEY, "Content-Type": "application/json" }
        : { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
        if (!r.ok) throw new Error((j && j.message) || ("Error " + r.status));
        return j;
      });
    });
  }
  function rpc(fn, body) { return sb("rpc/" + fn, { method: "POST", body: body }); }

  function loadScripts(q, sort) {
    var order = sort === "oldest" ? "created_at.asc" : sort === "liked" ? "likes.desc,created_at.desc" : "created_at.desc";
    var url = "public_scripts?select=id,name,description,image_url,author_name,author_id,likes,installs,created_at&order=" + order + "&limit=50";
    if (q) url += "&name=ilike." + encodeURIComponent("*" + q + "*");
    return sb(url);
  }

  // ---------- userscript engine ----------
  var running = {};
  function ensure() {
    if (!Array.isArray(storage.scripts)) {
      storage.scripts = [{ id: "s0", name: "Example", description: "Shows a toast.", image: "", code: EXAMPLE, enabled: false }];
    }
  }
  function stop(id) {
    var list = running[id];
    if (!list) return;
    delete running[id];
    list.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function patchComponent(name, style) {
    var mod = findByName(name, false);
    if (!mod || typeof mod.default !== "function") throw new Error("Component not found: " + name);
    return patcher.after("default", mod, function (args, ret) {
      if (!ret || !ret.props) return;
      var extra = typeof style === "function" ? style(args[0], ret) : style;
      return React.cloneElement(ret, { style: [ret.props.style, extra] });
    });
  }
  var ARGS = ["vendetta", "React", "ReactNative", "findByName", "findByProps", "patch", "patchComponent", "cleanup", "toast"];
  function start(s) {
    stop(s.id);
    var cleanups = [];
    running[s.id] = cleanups;
    var api = {
      vendetta: vendetta, React: React, ReactNative: RN, findByName: findByName, findByProps: findByProps,
      patch: function (type, fn, parent, cb) { var un = patcher[type](fn, parent, cb); cleanups.push(un); return un; },
      patchComponent: function (name, style) { var un = patchComponent(name, style); cleanups.push(un); return un; },
      cleanup: function (fn) { cleanups.push(fn); },
      toast: function (t) { showToast(String(t)); }
    };
    try {
      var factory = (0, eval)("(function(" + ARGS.join(",") + "){\n" + s.code + "\n})");
      factory.apply(null, ARGS.map(function (k) { return api[k]; }));
    } catch (e) {
      stop(s.id);
      showToast("[" + s.name + "] " + (e && e.message ? e.message : String(e)));
    }
  }
  function update(id, patch) {
    storage.scripts = (storage.scripts || []).map(function (s) {
      return s.id === id ? Object.assign({}, s, patch) : s;
    });
  }

  // ---------- small UI helpers ----------
  function Btn(label, onPress, color, disabled) {
    return h(Press, {
      onPress: disabled ? undefined : onPress,
      style: { backgroundColor: color || C.accent, opacity: disabled ? 0.5 : 1, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, marginRight: 8, marginTop: 8 }
    }, h(Text, { style: { color: "#fff", fontWeight: "600" } }, label));
  }
  function Pill(label, active, onPress) {
    return h(Press, {
      key: label, onPress: onPress,
      style: { backgroundColor: active ? C.accent : C.card, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 }
    }, h(Text, { style: { color: active ? "#fff" : C.sub, fontWeight: "600", fontSize: 13 } }, label));
  }
  function Field(value, onChange, placeholder, extra) {
    return h(TextInput, {
      value: value, onChangeText: onChange, placeholder: placeholder, placeholderTextColor: C.sub,
      autoCapitalize: "none", autoCorrect: false,
      style: Object.assign({ backgroundColor: C.input, color: C.text, borderRadius: 12, padding: 12, marginBottom: 8 }, extra || {})
    });
  }
  function Cover(uri, height) {
    if (!uri || uri.indexOf("http") !== 0) return null;
    return h(Image, { source: { uri: uri }, resizeMode: "cover", style: { width: "100%", height: height, borderRadius: 12, marginBottom: 10, backgroundColor: C.input } });
  }
  var WARN = "Scripts run code with full access to the app. Only enable scripts you have read and trust.";

  // ---------- Explore (market) ----------
  function MarketCard(p) {
    var it = p.it;
    var o = React.useState(false), open = o[0], setOpen = o[1];
    var c = React.useState(null), code = c[0], setCode = c[1];
    function toggle() {
      var next = !open;
      setOpen(next);
      if (next && code === null) {
        sb("public_scripts?id=eq." + it.id + "&select=code").then(function (r) { setCode(r && r[0] ? r[0].code : "(unavailable)"); }).catch(errToast);
      }
    }
    return h(View, { style: { backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 12 } },
      Cover(it.image_url, 150),
      h(Press, { onPress: toggle },
        h(Text, { style: { color: C.text, fontSize: 17, fontWeight: "700" } }, it.name),
        h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, "by " + it.author_name),
        h(Text, { numberOfLines: open ? undefined : 3, style: { color: C.sub, marginTop: 6 } }, it.description || "No description")),
      h(View, { style: { flexDirection: "row", alignItems: "center", marginTop: 10 } },
        h(Press, { onPress: function () { p.onLike(it); }, style: { flexDirection: "row", alignItems: "center", marginRight: 16 } },
          h(Text, { style: { color: p.liked ? C.heart : C.sub, fontSize: 16 } }, p.liked ? "\u2665" : "\u2661"),
          h(Text, { style: { color: C.sub, marginLeft: 4 } }, String(it.likes))),
        h(Text, { style: { color: C.sub, flex: 1 } }, "\u2193 " + it.installs + " installs"),
        p.installed ? h(Text, { style: { color: C.sub, fontWeight: "600" } }, "Installed") : Btn("Install", function () { p.onInstall(it); })),
      open && h(View, { style: { marginTop: 10 } },
        h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 4 } }, "Code:"),
        h(ScrollView, { nestedScrollEnabled: true, style: { maxHeight: 220, backgroundColor: C.input, borderRadius: 10, padding: 10 } },
          h(Text, { selectable: true, style: { color: C.text, fontFamily: "monospace", fontSize: 12 } }, code === null ? "Loading..." : code)))
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

    React.useEffect(function () {
      if (!configured) return;
      var dead = false;
      var t = setTimeout(function () {
        setLoading(true); setErr(null);
        loadScripts(q.trim(), sort)
          .then(function (rows) { if (!dead) setItems(rows || []); })
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
      rpc("toggle_like", { p_script: it.id, p_user: u.id }).then(function (n) {
        setLiked(function (cur) { var m = Object.assign({}, cur); m[it.id] = !cur[it.id]; return m; });
        if (typeof n === "number") patchItem(it.id, { likes: n });
      }).catch(errToast);
    }
    function onInstall(it) {
      var u = me();
      if ((storage.scripts || []).some(function (s) { return s.fromMarket && s.remoteId === it.id; })) return showToast("Already installed");
      sb("public_scripts?id=eq." + it.id + "&select=code").then(function (rows) {
        if (!rows || !rows[0]) throw new Error("Script no longer exists");
        storage.scripts = (storage.scripts || []).concat([{
          id: "m" + it.id, remoteId: it.id, fromMarket: true, name: it.name, description: it.description || "",
          image: it.image_url || "", author: it.author_name, code: rows[0].code, enabled: false
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
        h(Text, { style: { color: C.sub, marginTop: 6 } }, "Set SUPABASE_URL and SUPABASE_KEY in index.js (see setup.sql), then publish the plugin again."));
    }

    return h(ScrollView, { contentContainerStyle: { padding: 12 }, keyboardShouldPersistTaps: "handled" },
      Field(q, setQ, "Search by name...", { borderRadius: 24, paddingHorizontal: 16 }),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
        Pill("Newest", sort === "new", function () { setSort("new"); }),
        Pill("Oldest", sort === "oldest", function () { setSort("oldest"); }),
        Pill("Most liked", sort === "liked", function () { setSort("liked"); })),
      h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 12 } }, "\u26A0 " + WARN),
      loading && h(Text, { style: { color: C.sub, marginBottom: 8 } }, "Loading..."),
      err && h(Text, { style: { color: C.danger, marginBottom: 8 } }, err),
      !loading && !err && items.length === 0 && h(Text, { style: { color: C.sub } }, "No scripts found."),
      items.map(function (it) {
        return h(MarketCard, { key: it.id, it: it, liked: !!liked[it.id], installed: !!installedIds[it.id], onLike: onLike, onInstall: onInstall });
      }),
      Btn("Refresh", function () { setTick(tick + 1); }, C.card)
    );
  }

  // ---------- My scripts ----------
  function ScriptCard(p) {
    var s = p.s;
    var o = React.useState(false), open = o[0], setOpen = o[1];
    var n = React.useState(s.name), name = n[0], setName = n[1];
    var d = React.useState(s.description || ""), desc = d[0], setDesc = d[1];
    var im = React.useState(s.image || ""), img = im[0], setImg = im[1];
    var c = React.useState(s.code), code = c[0], setCode = c[1];
    var st = React.useState(null), stats = st[0], setStats = st[1];
    var b = React.useState(false), busy = b[0], setBusy = b[1];

    React.useEffect(function () {
      if (!configured || !s.isPublic || !s.remoteId || s.fromMarket) return;
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
      if (s.enabled) start({ id: s.id, name: f.name, code: f.code });
      if (s.isPublic && s.remoteId && !s.fromMarket) {
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
        var f = saveLocal();
        var token = s.token || makeToken();
        rpc("publish_script", { p_name: f.name, p_description: f.description, p_image: f.image, p_code: f.code, p_author_id: u.id, p_author_name: u.name, p_token: token })
          .then(function (id) { update(s.id, { remoteId: id, token: token, isPublic: true }); showToast("Published to the market as " + u.name); })
          .catch(errToast).then(function () { setBusy(false); });
      } else {
        rpc("unpublish_script", { p_id: s.remoteId, p_token: s.token })
          .then(function () { update(s.id, { isPublic: false, remoteId: null, token: null }); setStats(null); showToast("Now private"); })
          .catch(errToast).then(function () { setBusy(false); });
      }
    }
    function toggleEnable(v) {
      var go = function () {
        update(s.id, { enabled: v });
        if (v) start({ id: s.id, name: name, code: code }); else stop(s.id);
      };
      if (v && s.fromMarket) confirmBox("Enable this script?", "This script was written by " + (s.author || "someone else") + ". " + WARN, go);
      else go();
    }

    var sub = s.fromMarket ? "Installed from the market · by " + (s.author || "?")
      : s.isPublic ? "Public" + (stats ? " · \u2665 " + stats.likes + " · \u2193 " + stats.installs + " installs" : "")
      : "Private";

    return h(View, { style: { backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 12 } },
      h(View, { style: { flexDirection: "row", alignItems: "center" } },
        h(Press, { style: { flex: 1 }, onPress: function () { setOpen(!open); } },
          h(Text, { style: { color: C.text, fontSize: 16, fontWeight: "700" } }, (open ? "\u25BE " : "\u25B8 ") + s.name),
          h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, sub)),
        h(Switch, { value: !!s.enabled, onValueChange: toggleEnable })),
      open && h(View, { style: { marginTop: 12 } },
        Cover(img, 140),
        Field(name, setName, "Script name"),
        Field(desc, setDesc, "Description: what the script does", { minHeight: 70, textAlignVertical: "top" }),
        Field(img, setImg, "Image link (https://...)"),
        Field(code, setCode, "// JavaScript code", { minHeight: 180, textAlignVertical: "top", fontFamily: "monospace", fontSize: 13 }),
        !s.fromMarket && h(View, { style: { flexDirection: "row", alignItems: "center", marginVertical: 6 } },
          h(View, { style: { flex: 1 } },
            h(Text, { style: { color: C.text, fontWeight: "600" } }, s.isPublic ? "Public" : "Private"),
            h(Text, { style: { color: C.sub, fontSize: 12 } }, "Public = listed in Explore, under your name")),
          h(Switch, { value: !!s.isPublic, onValueChange: setPublic, disabled: busy })),
        h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          Btn("Save", save),
          Btn("Run", function () { start({ id: s.id, name: name, code: code }); }, C.green),
          Btn("Delete", function () {
            confirmBox("Delete this script?", s.isPublic ? "It stays public in the market until you make it private." : "It will only be deleted from this phone.", function () {
              stop(s.id);
              storage.scripts = (storage.scripts || []).filter(function (x) { return x.id !== s.id; });
            });
          }, C.danger)))
    );
  }

  function Mine() {
    useProxy(storage);
    ensure();
    return h(ScrollView, { contentContainerStyle: { padding: 12 }, keyboardShouldPersistTaps: "handled" },
      h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 12 } },
        "Available in code: vendetta, React, ReactNative, findByName, findByProps, patch, patchComponent, cleanup, toast."),
      (storage.scripts || []).map(function (s) { return h(ScriptCard, { key: s.id, s: s }); }),
      Btn("+ New script", function () {
        storage.scripts = (storage.scripts || []).concat([{ id: "s" + Date.now(), name: "New script", description: "", image: "", code: "// write your code here\n", enabled: false }]);
      })
    );
  }

  function Settings() {
    useProxy(storage);
    ensure();
    var t = React.useState("explore"), tab = t[0], setTab = t[1];
    return h(View, { style: { flex: 1 } },
      h(View, { style: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 12 } },
        Pill("Explore", tab === "explore", function () { setTab("explore"); }),
        Pill("My scripts", tab === "mine", function () { setTab("mine"); })),
      tab === "explore" ? h(Explore) : h(Mine));
  }

  return {
    onLoad: function () {
      ensure();
      (storage.scripts || []).forEach(function (s) { if (s.enabled) start(s); });
    },
    onUnload: function () { Object.keys(running).forEach(stop); },
    settings: Settings
  };
})()
