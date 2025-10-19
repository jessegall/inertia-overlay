import { ref as i, computed as v, readonly as re, reactive as se, nextTick as N, watch as le, onBeforeMount as M, onBeforeUnmount as ce, defineComponent as O, createElementBlock as A, openBlock as f, normalizeClass as Y, unref as m, onMounted as ue, resolveComponent as $, createVNode as R, createBlock as h, createCommentVNode as D, Teleport as ie, createElementVNode as C, Transition as j, withCtx as U, withDirectives as G, renderSlot as H, vShow as K, shallowRef as T, resolveDynamicComponent as z, mergeProps as ve, h as B } from "vue";
import { usePage as Q, router as E } from "@inertiajs/vue3";
function pe() {
  const e = i([]);
  function t(s) {
    o(s) || e.value.push(s);
  }
  function n(s) {
    o(s) && (e.value = e.value.filter((c) => c !== s));
  }
  function o(s) {
    return e.value.includes(s);
  }
  function a() {
    return e.value.length > 0;
  }
  function r() {
    return e.value.length;
  }
  return {
    register: t,
    unregister: n,
    hasOverlay: o,
    hasOverlays: a,
    size: r,
    stack: re(e),
    activeOverlayId: v(() => a() ? e.value[e.value.length - 1] : null)
  };
}
let L = null;
function g() {
  return L || (L = pe()), L;
}
function de() {
  const e = i(null);
  function t() {
    return new URL(window.location.href).searchParams.get("overlay");
  }
  function n(o) {
    e.value = o;
  }
  return {
    options: e,
    overlayQueryParam: t,
    setOptions: n
  };
}
let b = null;
function _() {
  return b || (b = de()), b;
}
function fe(e) {
  const t = g(), n = Q(), o = i(), a = i({});
  function r() {
    var u;
    return new URL(`${window.location.host}${n.url}`).searchParams.has("overlay", e) && ((u = _().options.value) == null ? void 0 : u.id) === e && t.activeOverlayId.value === e;
  }
  function s() {
    if (!r()) return o.value;
    const { options: l } = _();
    return o.value = l.value, l.value;
  }
  function c() {
    if (!r()) return a.value;
    const { options: l } = _(), u = {};
    for (const y of l.value.props)
      u[y] = a.value[y] ?? n.props[y];
    return a.value = n.props, u;
  }
  return {
    options: v(s),
    props: v(c),
    isContextActive: r
  };
}
function ye() {
  const e = /* @__PURE__ */ new Set();
  function t(a) {
    return e.add(a), () => n(a);
  }
  function n(a) {
    e.delete(a);
  }
  function o(a) {
    e.forEach((r) => {
      r(a);
    });
  }
  return [{ listen: t, remove: n }, o];
}
const d = {
  OVERLAY: "X-Inertia-Overlay",
  OVERLAY_INDEX: "X-Inertia-Overlay-Index",
  OVERLAY_ID: "X-Inertia-Overlay-Id",
  OVERLAY_OPENING_ID: "X-Inertia-Overlay-Opening-Id",
  OVERLAY_CLOSING_ID: "X-Inertia-Overlay-Closing-Id",
  OVERLAY_STACK: "X-Inertia-Overlay-Stack",
  OVERLAY_ROOT_URL: "X-Inertia-Overlay-Root-Url",
  OVERLAY_PREVIOUS_URL: "X-Inertia-Overlay-Previous-Url",
  OVERLAY_PAGE_COMPONENT: "X-Inertia-Overlay-Page-Component"
}, P = /* @__PURE__ */ new Map();
function me(e) {
  const t = g(), n = fe(e), [o, a] = ye(), r = se({
    status: "closed"
  }), s = i(), c = v(() => t.stack.value.indexOf(e));
  function l(p) {
    switch (console.log(`Overlay [${e}] status changed to: ${p}`), r.status = p, p) {
      case "opening":
        t.register(e), s.value = window.location.href;
        break;
      case "closed":
        t.unregister(e);
        break;
    }
    a(p);
  }
  function u(...p) {
    return p.includes(r.status);
  }
  function y() {
    u("opening", "open") || (l("opening"), n.isContextActive() ? N(() => l("open")) : E.reload({
      headers: {
        [d.OVERLAY_OPENING_ID]: e
      },
      data: {
        overlay: e
      },
      onSuccess() {
        l("open");
      },
      onError: () => {
        l("closed");
      }
    }));
  }
  function w() {
    if (!u("closing", "closed"))
      if (l("closing"), n.isContextActive()) {
        const p = Date.now();
        E.reload({
          headers: {
            [d.OVERLAY_CLOSING_ID]: e
          },
          onSuccess() {
            const oe = Date.now() - p, ae = Math.max(0, 250 - oe);
            setTimeout(() => l("closed"), ae);
          },
          onError() {
            l("open");
          }
        });
      } else
        N(() => l("closed"));
  }
  return {
    id: e,
    state: r,
    index: c,
    onStatusChange: o,
    open: y,
    close: w,
    hasStatus: u,
    get previousUrl() {
      return s.value;
    },
    get options() {
      return n.options.value;
    },
    get props() {
      return n.props.value;
    }
  };
}
function Oe(e, t = {}) {
  if (Object.keys(t).length === 0) return e;
  const n = JSON.stringify(t), o = btoa(decodeURI(encodeURIComponent(n)));
  return `${e}:${o}`;
}
function S(e, t, n) {
  const o = t !== void 0 && !("autoOpen" in t), a = o ? Oe(e, t) : e, r = o ? n : t, s = (r == null ? void 0 : r.autoOpen) ?? !0;
  if (!P.has(a)) {
    const c = me(a);
    P.set(a, c), s && c.open();
  }
  return P.get(a);
}
const x = i(0), k = i(0), V = i(0);
function _e(e) {
  const t = i(V.value), n = i(0);
  function o() {
    n.value = x.value, x.value = t.value, k.value++, k.value === 1 && (document.body.style.overflow = "hidden");
  }
  function a() {
    x.value = n.value, k.value--, k.value === 0 && (document.body.style.overflow = "");
  }
  return le(e, (r) => {
    r ? o() : a();
  }), M(() => {
    V.value++;
  }), ce(() => {
    V.value--, e.value && a();
  }), {
    index: t,
    isTop: () => t.value === x.value
  };
}
const J = /* @__PURE__ */ O({
  __name: "OverlayBackdrop",
  props: {
    blur: { type: Boolean, default: !1 },
    minDuration: { default: 250 }
  },
  setup(e) {
    const t = e, n = v(() => t.blur), { isTop: o } = _e(n);
    return (a, r) => (f(), A("div", {
      class: Y(["backdrop-blur-component fixed inset-0 flex justify-center items-center bg-black backdrop-blur-sm transition-opacity opacity-0 pointer-events-none", { "opacity-20 pointer-events-auto": n.value && m(o)() }])
    }, null, 2));
  }
}), he = { class: "overlay-stack" }, ge = /* @__PURE__ */ O({
  __name: "OverlayStack",
  props: {
    stack: {}
  },
  setup(e) {
    const t = e, n = i(!1), o = v(() => t.stack[t.stack.length - 1]), a = v(() => t.stack.slice(1)), r = S(o.value);
    return ue(() => N(() => {
      n.value = !0;
      const s = r.onStatusChange.listen((c) => {
        ["closing", "closed"].includes(c) && (n.value = !1, s());
      });
    })), (s, c) => {
      const l = $("Overlay"), u = $("OverlayStack", !0);
      return f(), A("div", he, [
        R(J, {
          blur: n.value,
          onClick: m(r).close
        }, null, 8, ["blur", "onClick"]),
        R(l, { id: o.value }, null, 8, ["id"]),
        a.value.length > 0 ? (f(), h(u, {
          key: 0,
          stack: a.value
        }, null, 8, ["stack"])) : D("", !0)
      ]);
    };
  }
}), q = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [o, a] of t)
    n[o] = a;
  return n;
}, F = /* @__PURE__ */ q(ge, [["__scopeId", "data-v-dad7d973"]]), we = { class: "inertia-overlay" }, W = /* @__PURE__ */ O({
  __name: "OverlayRoot",
  setup(e) {
    const { stack: t } = g();
    return (n, o) => (f(), h(ie, { to: "body" }, [
      C("div", we, [
        m(t).length > 0 ? (f(), h(F, {
          key: 0,
          stack: [...m(t)]
        }, null, 8, ["stack"])) : D("", !0)
      ])
    ]));
  }
}), Z = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  "80%": "max-w-[80%]",
  full: "max-w-[95%]"
}, xe = { class: "fixed inset-0 overflow-y-auto px-4 sm:px-0 z-50 pointer-events-none" }, ke = { class: "h-full w-full flex justify-end" }, Ie = /* @__PURE__ */ O({
  __name: "OverlayDrawer",
  props: {
    show: { type: Boolean },
    size: {}
  },
  setup(e) {
    const t = e, n = v(() => Z[t.size]);
    return (o, a) => (f(), A("div", xe, [
      C("div", ke, [
        R(j, {
          name: "slide-right",
          appear: ""
        }, {
          default: U(() => [
            G(C("div", {
              class: Y([n.value, "bg-white pointer-events-auto shadow-xl w-full transform transition-all"])
            }, [
              H(o.$slots, "default", {}, void 0, !0)
            ], 2), [
              [K, e.show]
            ])
          ]),
          _: 3
        })
      ])
    ]));
  }
}), ee = /* @__PURE__ */ q(Ie, [["__scopeId", "data-v-a636436a"]]), Re = { class: "fixed inset-0 overflow-y-auto px-4 py-6 sm:px-0 z-50 pointer-events-none" }, te = /* @__PURE__ */ O({
  __name: "OverlayModal",
  props: {
    show: { type: Boolean },
    size: {}
  },
  setup(e) {
    const t = e, n = v(() => Z[t.size]);
    return (o, a) => (f(), A("div", Re, [
      R(j, {
        "enter-active-class": "ease-out duration-150",
        "enter-from-class": "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95",
        "enter-to-class": "opacity-100 translate-y-0 sm:scale-100",
        "leave-active-class": "ease-in duration-150",
        "leave-from-class": "opacity-100 translate-y-0 sm:scale-100",
        "leave-to-class": "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95",
        appear: ""
      }, {
        default: U(() => [
          G(C("div", {
            class: Y([n.value, "mb-6 bg-white rounded-lg shadow-xl transform transition-all sm:w-full sm:mx-auto pointer-events-auto overflow-hidden"])
          }, [
            H(o.$slots, "default")
          ], 2), [
            [K, e.show]
          ])
        ]),
        _: 3
      })
    ]));
  }
});
function Ce() {
  async function e(t) {
    const n = be();
    if (!n)
      throw new Error("Overlay component resolver not configured. Use createInertiaOverlayPlugin()");
    const o = await n(t);
    return typeof o == "object" && "default" in o ? o.default : o;
  }
  return {
    resolve: e
  };
}
const Ee = /* @__PURE__ */ O({
  __name: "Overlay",
  props: {
    id: {}
  },
  emits: ["close"],
  setup(e, { emit: t }) {
    const n = {
      modal: te,
      drawer: ee
    }, o = t, a = S(e.id), r = T(), s = T(), c = v(() => ["open", "closing"].includes(a.state.status)), l = v(() => a.state.status === "open"), { resolve: u } = Ce();
    function y() {
      a.close(), o("close");
    }
    return M(() => {
      a.onStatusChange.listen(async (w) => {
        switch (w) {
          case "open":
            r.value = n[a.options.variant], s.value = await u(a.options.type);
            break;
        }
      });
    }), (w, p) => c.value ? (f(), h(z(r.value), {
      key: 0,
      show: l.value,
      size: m(a).options.size
    }, {
      default: U(() => [
        (f(), h(z(s.value), ve(m(a).props, { onClose: y }), null, 16))
      ]),
      _: 1
    }, 8, ["show", "size"])) : D("", !0);
  }
});
let ne;
function Ae(e) {
  const t = e._component.render;
  e._component.render = function() {
    return B("div", null, [
      t.call(this),
      B(W)
    ]);
  };
}
let I = null;
function Se(e) {
  var n;
  const t = g();
  if (t.hasOverlays()) {
    const o = S(t.activeOverlayId.value);
    e.preserveScroll = !0, !((n = e.only) != null && n.length) && !(o.index.value === 0 && o.hasStatus("closing")) && (e.only = ["__overlay-partial-reload-trigger__"]), !I && o.index.value === 0 && o.hasStatus("opening") && (I = window.location.href), e.headers[d.OVERLAY] = "true", e.headers[d.OVERLAY_ID] = o.id, e.headers[d.OVERLAY_INDEX] = o.index.value.toString(), e.headers[d.OVERLAY_STACK] = t.stack.value.join(","), e.headers[d.OVERLAY_PREVIOUS_URL] = o.previousUrl, e.headers[d.OVERLAY_ROOT_URL] = I, e.headers[d.OVERLAY_PAGE_COMPONENT] = Q().component;
  } else
    I = null;
}
function Le(e) {
  const { setOptions: t } = _();
  e.overlay && t(e.overlay);
}
function X() {
  const { activeOverlayId: e, size: t } = g(), { overlayQueryParam: n } = _(), o = n();
  if (o && o != e.value) {
    const a = t() === 0 ? 0 : 300;
    setTimeout(() => {
      S(o).open();
    }, a);
  }
}
function Ye(e) {
  return ne = e, {
    install(t) {
      t.component("Overlay", Ee), t.component("OverlayBackdrop", J), t.component("OverlayDrawer", ee), t.component("OverlayModal", te), t.component("OverlayRoot", W), t.component("OverlayStack", F), Ae(t), X(), E.on("before", (n) => {
        Se(n.detail.visit);
      }), E.on("success", (n) => {
        Le(n.detail.page), X();
      }), console.log("Inertia Overlay Plugin installed");
    }
  };
}
function be() {
  return ne;
}
export {
  Ye as createInertiaOverlayPlugin,
  S as useOverlay
};
