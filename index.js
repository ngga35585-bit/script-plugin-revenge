(function () {
  // === CONFIG: pune datele din Supabase (Project Settings → API) ===
  var SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
  var SUPABASE_KEY = "YOUR-ANON-KEY";
  // =================================================================

  var configured = SUPABASE_URL.indexOf("YOUR-PROJECT") === -1 && SUPABASE_KEY.indexOf("YOUR-ANON") === -1;

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
    "// Exemplu: toast la pornire\n" +
    "toast('Scriptul meu merge!');\n\n" +
    "// Stilizare: schimba 'NumeComponent' cu un nume real de componenta\n" +
    "// patchComponent('NumeComponent', { borderRadius: 24 });\n" +
    "// Mutare: patchComponent('NumeComponent', { transform: [{ translateY: 10 }] });\n";

  // ---------- util ----------
  function me() {
    var u = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
    return u ? { id: String(u.id), name: u.globalName || u.username || "anonim" } : { id: "anon", name: "anonim" };
  }
  function makeToken() {
    var t = "";
    for (var i = 0; i < 4; i++) t += Math.random().toString(36).slice(2);
    return t;
  }
  function errToast(e) { showToast(e && e.message ? e.message : String(e)); }
  function confirmBox(title, content, onConfirm) {
    if (alerts && alerts.showConfirmationAlert) {
      alerts.showConfirmationAlert({ title: title, content: content, confirmText: "Continuă", cancelText: "Anulează", onConfirm: onConfirm });
    } else onConfirm();
  }

  function sb(path, opts) {
    opts = opts || {};
    return fetch(SUPABASE_URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
        if (!r.ok) throw new Error((j && j.message) || ("Eroare " + r.status));
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

  // ---------- engine userscripts ----------
  var running = {};
  function ensure() {
    if (!Array.isArray(storage.scripts)) {
      storage.scripts = [{ id: "s0", name: "Exemplu", description: "Arată un toast.", image: "", code: EXAMPLE, enabled: false }];
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
    if (!mod || typeof mod.default !== "function") throw new Error("Componenta nu exista: " + name);
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

  // ---------- UI mici ----------
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
  var WARN = "Scripturile rulează cod cu acces complet la aplicație. Activează doar scripturi pe care le-ai citit și în care ai încredere.";

  // ---------- Explorează (market) ----------
  function MarketCard(p) {
    var it = p.it;
    var o = React.useState(false), open = o[0], setOpen = o[1];
    var c = React.useState(null), code = c[0], setCode = c[1];
    function toggle() {
      var next = !open;
      setOpen(next);
      if (next && code === null) {
        sb("public_scripts?id=eq." + it.id + "&select=code").then(function (r) { setCode(r && r[0] ? r[0].code : "(indisponibil)"); }).catch(errToast);
      }
    }
    return h(View, { style: { backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 12 } },
      Cover(it.image_url, 150),
      h(Press, { onPress: toggle },
        h(Text, { style: { color: C.text, fontSize: 17, fontWeight: "700" } }, it.name),
        h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, "de " + it.author_name),
        h(Text, { numberOfLines: open ? undefined : 3, style: { color: C.sub, marginTop: 6 } }, it.description || "Fără descriere")),
      h(View, { style: { flexDirection: "row", alignItems: "center", marginTop: 10 } },
        h(Press, { onPress: function () { p.onLike(it); }, style: { flexDirection: "row", alignItems: "center", marginRight: 16 } },
          h(Text, { style: { color: p.liked ? C.heart : C.sub, fontSize: 16 } }, p.liked ? "\u2665" : "\u2661"),
          h(Text, { style: { color: C.sub, marginLeft: 4 } }, String(it.likes))),
        h(Text, { style: { color: C.sub, flex: 1 } }, "\u2193 " + it.installs + " instalări"),
        p.installed ? h(Text, { style: { color: C.sub, fontWeight: "600" } }, "Instalat") : Btn("Instalează", function () { p.onInstall(it); })),
      open && h(View, { style: { marginTop: 10 } },
        h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 4 } }, "Cod:"),
        h(ScrollView, { nestedScrollEnabled: true, style: { maxHeight: 220, backgroundColor: C.input, borderRadius: 10, padding: 10 } },
          h(Text, { selectable: true, style: { color: C.text, fontFamily: "monospace", fontSize: 12 } }, code === null ? "Se încarcă..." : code)))
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
      if (u.id === "anon") return showToast("Nu pot afla contul tău");
      rpc("toggle_like", { p_script: it.id, p_user: u.id }).then(function (n) {
        setLiked(function (cur) { var m = Object.assign({}, cur); m[it.id] = !cur[it.id]; return m; });
        if (typeof n === "number") patchItem(it.id, { likes: n });
      }).catch(errToast);
    }
    function onInstall(it) {
      var u = me();
      if ((storage.scripts || []).some(function (s) { return s.fromMarket && s.remoteId === it.id; })) return showToast("Deja instalat");
      sb("public_scripts?id=eq." + it.id + "&select=code").then(function (rows) {
        if (!rows || !rows[0]) throw new Error("Scriptul nu mai există");
        storage.scripts = (storage.scripts || []).concat([{
          id: "m" + it.id, remoteId: it.id, fromMarket: true, name: it.name, description: it.description || "",
          image: it.image_url || "", author: it.author_name, code: rows[0].code, enabled: false
        }]);
        showToast("Instalat. Activează-l din „Ale mele”");
        return u.id === "anon" ? null : rpc("add_install", { p_script: it.id, p_user: u.id });
      }).then(function (n) {
        if (typeof n === "number") patchItem(it.id, { installs: n });
      }).catch(errToast);
    }

    var installedIds = {};
    (storage.scripts || []).forEach(function (s) { if (s.fromMarket && s.remoteId) installedIds[s.remoteId] = true; });

    if (!configured) {
      return h(ScrollView, { contentContainerStyle: { padding: 12 } },
        h(Text, { style: { color: C.text, fontSize: 16, fontWeight: "700" } }, "Marketul nu e configurat"),
        h(Text, { style: { color: C.sub, marginTop: 6 } }, "Pune SUPABASE_URL și SUPABASE_KEY în index.js (vezi setup.sql), apoi publică din nou pluginul."));
    }

    return h(ScrollView, { contentContainerStyle: { padding: 12 }, keyboardShouldPersistTaps: "handled" },
      Field(q, setQ, "Caută după nume...", { borderRadius: 24, paddingHorizontal: 16 }),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
        Pill("Cele mai noi", sort === "new", function () { setSort("new"); }),
        Pill("Cele mai vechi", sort === "oldest", function () { setSort("oldest"); }),
        Pill("Cele mai apreciate", sort === "liked", function () { setSort("liked"); })),
      h(Text, { style: { color: C.sub, fontSize: 12, marginBottom: 12 } }, "\u26A0 " + WARN),
      loading && h(Text, { style: { color: C.sub, marginBottom: 8 } }, "Se încarcă..."),
      err && h(Text, { style: { color: C.danger, marginBottom: 8 } }, err),
      !loading && !err && items.length === 0 && h(Text, { style: { color: C.sub } }, "Niciun script găsit."),
      items.map(function (it) {
        return h(MarketCard, { key: it.id, it: it, liked: !!liked[it.id], installed: !!installedIds[it.id], onLike: onLike, onInstall: onInstall });
      }),
      Btn("Reîmprospătează", function () { setTick(tick + 1); }, C.card)
    );
  }

  // ---------- Ale mele ----------
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

    function fields() { return { name: name.trim() || "Fără nume", description: desc.trim(), image: img.trim(), code: code }; }
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
          .then(function () { showToast("Salvat și actualizat în market"); }).catch(errToast);
      } else showToast("Salvat");
    }
    function setPublic(v) {
      if (busy) return;
      setBusy(true);
      if (v) {
        var u = me();
        if (u.id === "anon") { setBusy(false); return showToast("Nu pot afla contul tău"); }
        var f = saveLocal();
        var token = s.token || makeToken();
        rpc("publish_script", { p_name: f.name, p_description: f.description, p_image: f.image, p_code: f.code, p_author_id: u.id, p_author_name: u.name, p_token: token })
          .then(function (id) { update(s.id, { remoteId: id, token: token, isPublic: true }); showToast("Publicat în market ca " + u.name); })
          .catch(errToast).then(function () { setBusy(false); });
      } else {
        rpc("unpublish_script", { p_id: s.remoteId, p_token: s.token })
          .then(function () { update(s.id, { isPublic: false, remoteId: null, token: null }); setStats(null); showToast("Acum e privat"); })
          .catch(errToast).then(function () { setBusy(false); });
      }
    }
    function toggleEnable(v) {
      var go = function () {
        update(s.id, { enabled: v });
        if (v) start({ id: s.id, name: name, code: code }); else stop(s.id);
      };
      if (v && s.fromMarket) confirmBox("Activezi scriptul?", "Scriptul e scris de " + (s.author || "altcineva") + ". " + WARN, go);
      else go();
    }

    var sub = s.fromMarket ? "Instalat din market · de " + (s.author || "?")
      : s.isPublic ? "Public" + (stats ? " · \u2665 " + stats.likes + " · \u2193 " + stats.installs + " instalări" : "")
      : "Privat";

    return h(View, { style: { backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 12 } },
      h(View, { style: { flexDirection: "row", alignItems: "center" } },
        h(Press, { style: { flex: 1 }, onPress: function () { setOpen(!open); } },
          h(Text, { style: { color: C.text, fontSize: 16, fontWeight: "700" } }, (open ? "\u25BE " : "\u25B8 ") + s.name),
          h(Text, { style: { color: C.sub, fontSize: 12, marginTop: 2 } }, sub)),
        h(Switch, { value: !!s.enabled, onValueChange: toggleEnable })),
      open && h(View, { style: { marginTop: 12 } },
        Cover(img, 140),
        Field(name, setName, "Nume script"),
        Field(desc, setDesc, "Descriere: ce face scriptul", { minHeight: 70, textAlignVertical: "top" }),
        Field(img, setImg, "Link poză (https://...)"),
        Field(code, setCode, "// cod JavaScript", { minHeight: 180, textAlignVertical: "top", fontFamily: "monospace", fontSize: 13 }),
        !s.fromMarket && h(View, { style: { flexDirection: "row", alignItems: "center", marginVertical: 6 } },
          h(View, { style: { flex: 1 } },
            h(Text, { style: { color: C.text, fontWeight: "600" } }, s.isPublic ? "Public" : "Privat"),
            h(Text, { style: { color: C.sub, fontSize: 12 } }, "Public = apare în Explorează, cu numele tău")),
          h(Switch, { value: !!s.isPublic, onValueChange: setPublic, disabled: busy })),
        h(View, { style: { flexDirection: "row", flexWrap: "wrap" } },
          Btn("Salvează", save),
          Btn("Rulează", function () { start({ id: s.id, name: name, code: code }); }, C.green),
          Btn("Șterge", function () {
            confirmBox("Ștergi scriptul?", s.isPublic ? "Rămâne public în market până îl faci privat." : "Se șterge doar de pe telefon.", function () {
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
        "Disponibile în cod: vendetta, React, ReactNative, findByName, findByProps, patch, patchComponent, cleanup, toast."),
      (storage.scripts || []).map(function (s) { return h(ScriptCard, { key: s.id, s: s }); }),
      Btn("+ Script nou", function () {
        storage.scripts = (storage.scripts || []).concat([{ id: "s" + Date.now(), name: "Script nou", description: "", image: "", code: "// scrie codul aici\n", enabled: false }]);
      })
    );
  }

  function Settings() {
    useProxy(storage);
    ensure();
    var t = React.useState("explore"), tab = t[0], setTab = t[1];
    return h(View, { style: { flex: 1 } },
      h(View, { style: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 12 } },
        Pill("Explorează", tab === "explore", function () { setTab("explore"); }),
        Pill("Ale mele", tab === "mine", function () { setTab("mine"); })),
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
