
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    function hasContext(key) {
        return get_current_component().$$.context.has(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind$1(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }
    /**
     * Base class to create strongly typed Svelte components.
     * This only exists for typing purposes and should be used in `.d.ts` files.
     *
     * ### Example:
     *
     * You have component library on npm called `component-library`, from which
     * you export a component called `MyComponent`. For Svelte+TypeScript users,
     * you want to provide typings. Therefore you create a `index.d.ts`:
     * ```ts
     * import { SvelteComponentTyped } from "svelte";
     * export class MyComponent extends SvelteComponentTyped<{foo: string}> {}
     * ```
     * Typing this makes it possible for IDEs like VS Code with the Svelte extension
     * to provide intellisense and to use the component like this in a Svelte file
     * with TypeScript:
     * ```svelte
     * <script lang="ts">
     * 	import { MyComponent } from "component-library";
     * </script>
     * <MyComponent foo={'bar'} />
     * ```
     *
     * #### Why not make this part of `SvelteComponent(Dev)`?
     * Because
     * ```ts
     * class ASubclassOfSvelteComponent extends SvelteComponent<{foo: string}> {}
     * const component: typeof SvelteComponent = ASubclassOfSvelteComponent;
     * ```
     * will throw a type error, so we need to seperate the more strictly typed class.
     */
    class SvelteComponentTyped extends SvelteComponentDev {
        constructor(options) {
            super(options);
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const currentPage = writable("Home");
    const modal = writable(null);

    var svelte = /*#__PURE__*/Object.freeze({
        __proto__: null,
        SvelteComponent: SvelteComponentDev,
        SvelteComponentTyped: SvelteComponentTyped,
        afterUpdate: afterUpdate,
        beforeUpdate: beforeUpdate,
        createEventDispatcher: createEventDispatcher,
        getContext: getContext,
        hasContext: hasContext,
        onDestroy: onDestroy,
        onMount: onMount,
        setContext: setContext,
        tick: tick
    });

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function expoOut(t) {
        return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t);
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* node_modules/svelte-simple-modal/src/Modal.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1, window: window_1 } = globals;
    const file$b = "node_modules/svelte-simple-modal/src/Modal.svelte";

    // (334:0) {#if Component}
    function create_if_block$3(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let t;
    	let div0;
    	let switch_instance;
    	let div1_transition;
    	let div3_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*state*/ ctx[0].closeButton && create_if_block_1$2(ctx);
    	var switch_value = /*Component*/ ctx[1];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div0 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div0, "class", "content svelte-2wx9ab");
    			attr_dev(div0, "style", /*cssContent*/ ctx[8]);
    			add_location(div0, file$b, 362, 8, 8703);
    			attr_dev(div1, "class", "window svelte-2wx9ab");
    			attr_dev(div1, "role", "dialog");
    			attr_dev(div1, "aria-modal", "true");
    			attr_dev(div1, "style", /*cssWindow*/ ctx[7]);
    			add_location(div1, file$b, 343, 6, 8078);
    			attr_dev(div2, "class", "window-wrap svelte-2wx9ab");
    			attr_dev(div2, "style", /*cssWindowWrap*/ ctx[6]);
    			add_location(div2, file$b, 342, 4, 8007);
    			attr_dev(div3, "class", "bg svelte-2wx9ab");
    			attr_dev(div3, "style", /*cssBg*/ ctx[5]);
    			add_location(div3, file$b, 334, 2, 7797);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t);
    			append_dev(div1, div0);

    			if (switch_instance) {
    				mount_component(switch_instance, div0, null);
    			}

    			/*div1_binding*/ ctx[39](div1);
    			/*div2_binding*/ ctx[40](div2);
    			/*div3_binding*/ ctx[41](div3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div1,
    						"introstart",
    						function () {
    							if (is_function(/*onOpen*/ ctx[12])) /*onOpen*/ ctx[12].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div1,
    						"outrostart",
    						function () {
    							if (is_function(/*onClose*/ ctx[13])) /*onClose*/ ctx[13].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div1,
    						"introend",
    						function () {
    							if (is_function(/*onOpened*/ ctx[14])) /*onOpened*/ ctx[14].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						div1,
    						"outroend",
    						function () {
    							if (is_function(/*onClosed*/ ctx[15])) /*onClosed*/ ctx[15].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(div3, "mousedown", /*handleOuterMousedown*/ ctx[19], false, false, false),
    					listen_dev(div3, "mouseup", /*handleOuterMouseup*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*state*/ ctx[0].closeButton) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*state*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (switch_value !== (switch_value = /*Component*/ ctx[1])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div0, null);
    				} else {
    					switch_instance = null;
    				}
    			}

    			if (!current || dirty[0] & /*cssContent*/ 256) {
    				attr_dev(div0, "style", /*cssContent*/ ctx[8]);
    			}

    			if (!current || dirty[0] & /*cssWindow*/ 128) {
    				attr_dev(div1, "style", /*cssWindow*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*cssWindowWrap*/ 64) {
    				attr_dev(div2, "style", /*cssWindowWrap*/ ctx[6]);
    			}

    			if (!current || dirty[0] & /*cssBg*/ 32) {
    				attr_dev(div3, "style", /*cssBg*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, /*currentTransitionWindow*/ ctx[11], /*state*/ ctx[0].transitionWindowProps, true);
    				div1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, /*currentTransitionBg*/ ctx[10], /*state*/ ctx[0].transitionBgProps, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, /*currentTransitionWindow*/ ctx[11], /*state*/ ctx[0].transitionWindowProps, false);
    			div1_transition.run(0);
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, /*currentTransitionBg*/ ctx[10], /*state*/ ctx[0].transitionBgProps, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    			if (switch_instance) destroy_component(switch_instance);
    			/*div1_binding*/ ctx[39](null);
    			if (detaching && div1_transition) div1_transition.end();
    			/*div2_binding*/ ctx[40](null);
    			/*div3_binding*/ ctx[41](null);
    			if (detaching && div3_transition) div3_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(334:0) {#if Component}",
    		ctx
    	});

    	return block;
    }

    // (356:8) {#if state.closeButton}
    function create_if_block_1$2(ctx) {
    	let show_if;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_2$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (dirty[0] & /*state*/ 1) show_if = !!/*isFunction*/ ctx[16](/*state*/ ctx[0].closeButton);
    		if (show_if) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx, [-1, -1]);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(356:8) {#if state.closeButton}",
    		ctx
    	});

    	return block;
    }

    // (359:10) {:else}
    function create_else_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "close svelte-2wx9ab");
    			attr_dev(button, "style", /*cssCloseButton*/ ctx[9]);
    			add_location(button, file$b, 359, 12, 8600);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*close*/ ctx[17], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*cssCloseButton*/ 512) {
    				attr_dev(button, "style", /*cssCloseButton*/ ctx[9]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(359:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (357:10) {#if isFunction(state.closeButton)}
    function create_if_block_2$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*state*/ ctx[0].closeButton;

    	function switch_props(ctx) {
    		return {
    			props: { onClose: /*close*/ ctx[17] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*state*/ ctx[0].closeButton)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(357:10) {#if isFunction(state.closeButton)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*Component*/ ctx[1] && create_if_block$3(ctx);
    	const default_slot_template = /*#slots*/ ctx[38].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[37], null);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window_1, "keydown", /*handleKeydown*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*Component*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*Component*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[1] & /*$$scope*/ 64)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[37], !current ? [-1, -1] : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function bind(Component, props = {}) {
    	return function ModalComponent(options) {
    		return new Component({
    				...options,
    				props: { ...props, ...options.props }
    			});
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Modal", slots, ['default']);
    	const dispatch = createEventDispatcher();
    	const baseSetContext = setContext;
    	let { show = null } = $$props;
    	let { key = "simple-modal" } = $$props;
    	let { closeButton = true } = $$props;
    	let { closeOnEsc = true } = $$props;
    	let { closeOnOuterClick = true } = $$props;
    	let { styleBg = {} } = $$props;
    	let { styleWindowWrap = {} } = $$props;
    	let { styleWindow = {} } = $$props;
    	let { styleContent = {} } = $$props;
    	let { styleCloseButton = {} } = $$props;
    	let { setContext: setContext$1 = baseSetContext } = $$props;
    	let { transitionBg = fade } = $$props;
    	let { transitionBgProps = { duration: 250 } } = $$props;
    	let { transitionWindow = transitionBg } = $$props;
    	let { transitionWindowProps = transitionBgProps } = $$props;

    	const defaultState = {
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindowWrap,
    		styleWindow,
    		styleContent,
    		styleCloseButton,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps
    	};

    	let state = { ...defaultState };
    	let Component = null;
    	let background;
    	let wrap;
    	let modalWindow;
    	let scrollY;
    	let cssBg;
    	let cssWindowWrap;
    	let cssWindow;
    	let cssContent;
    	let cssCloseButton;
    	let currentTransitionBg;
    	let currentTransitionWindow;
    	let prevBodyPosition;
    	let prevBodyOverflow;
    	let outerClickTarget;
    	const camelCaseToDash = str => str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();

    	const toCssString = props => props
    	? Object.keys(props).reduce((str, key) => `${str}; ${camelCaseToDash(key)}: ${props[key]}`, "")
    	: "";

    	const isFunction = f => !!(f && f.constructor && f.call && f.apply);

    	const updateStyleTransition = () => {
    		$$invalidate(5, cssBg = toCssString(Object.assign(
    			{},
    			{
    				width: window.innerWidth,
    				height: window.innerHeight
    			},
    			state.styleBg
    		)));

    		$$invalidate(6, cssWindowWrap = toCssString(state.styleWindowWrap));
    		$$invalidate(7, cssWindow = toCssString(state.styleWindow));
    		$$invalidate(8, cssContent = toCssString(state.styleContent));
    		$$invalidate(9, cssCloseButton = toCssString(state.styleCloseButton));
    		$$invalidate(10, currentTransitionBg = state.transitionBg);
    		$$invalidate(11, currentTransitionWindow = state.transitionWindow);
    	};

    	const toVoid = () => {
    		
    	};

    	let onOpen = toVoid;
    	let onClose = toVoid;
    	let onOpened = toVoid;
    	let onClosed = toVoid;

    	const open = (NewComponent, newProps = {}, options = {}, callback = {}) => {
    		$$invalidate(1, Component = bind(NewComponent, newProps));
    		$$invalidate(0, state = { ...defaultState, ...options });
    		updateStyleTransition();
    		disableScroll();

    		($$invalidate(12, onOpen = event => {
    			if (callback.onOpen) callback.onOpen(event);
    			dispatch("open");
    			dispatch("opening"); // Deprecated. Do not use!
    		}), $$invalidate(13, onClose = event => {
    			if (callback.onClose) callback.onClose(event);
    			dispatch("close");
    			dispatch("closing"); // Deprecated. Do not use!
    		}), $$invalidate(14, onOpened = event => {
    			if (callback.onOpened) callback.onOpened(event);
    			dispatch("opened");
    		}));

    		$$invalidate(15, onClosed = event => {
    			if (callback.onClosed) callback.onClosed(event);
    			dispatch("closed");
    		});
    	};

    	const close = (callback = {}) => {
    		$$invalidate(13, onClose = callback.onClose || onClose);
    		$$invalidate(15, onClosed = callback.onClosed || onClosed);
    		$$invalidate(1, Component = null);
    		enableScroll();
    	};

    	const handleKeydown = event => {
    		if (state.closeOnEsc && Component && event.key === "Escape") {
    			event.preventDefault();
    			close();
    		}

    		if (Component && event.key === "Tab") {
    			// trap focus
    			const nodes = modalWindow.querySelectorAll("*");

    			const tabbable = Array.from(nodes).filter(node => node.tabIndex >= 0);
    			let index = tabbable.indexOf(document.activeElement);
    			if (index === -1 && event.shiftKey) index = 0;
    			index += tabbable.length + (event.shiftKey ? -1 : 1);
    			index %= tabbable.length;
    			tabbable[index].focus();
    			event.preventDefault();
    		}
    	};

    	const handleOuterMousedown = event => {
    		if (state.closeOnOuterClick && (event.target === background || event.target === wrap)) outerClickTarget = event.target;
    	};

    	const handleOuterMouseup = event => {
    		if (state.closeOnOuterClick && event.target === outerClickTarget) {
    			event.preventDefault();
    			close();
    		}
    	};

    	const disableScroll = () => {
    		scrollY = window.scrollY;
    		prevBodyPosition = document.body.style.position;
    		prevBodyOverflow = document.body.style.overflow;
    		document.body.style.position = "fixed";
    		document.body.style.top = `-${scrollY}px`;
    		document.body.style.overflow = "hidden";
    	};

    	const enableScroll = () => {
    		document.body.style.position = prevBodyPosition || "";
    		document.body.style.top = "";
    		document.body.style.overflow = prevBodyOverflow || "";
    		window.scrollTo(0, scrollY);
    	};

    	setContext$1(key, { open, close });
    	let isMounted = false;

    	onDestroy(() => {
    		if (isMounted) close();
    	});

    	onMount(() => {
    		$$invalidate(36, isMounted = true);
    	});

    	const writable_props = [
    		"show",
    		"key",
    		"closeButton",
    		"closeOnEsc",
    		"closeOnOuterClick",
    		"styleBg",
    		"styleWindowWrap",
    		"styleWindow",
    		"styleContent",
    		"styleCloseButton",
    		"setContext",
    		"transitionBg",
    		"transitionBgProps",
    		"transitionWindow",
    		"transitionWindowProps"
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			modalWindow = $$value;
    			$$invalidate(4, modalWindow);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrap = $$value;
    			$$invalidate(3, wrap);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			background = $$value;
    			$$invalidate(2, background);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("show" in $$props) $$invalidate(21, show = $$props.show);
    		if ("key" in $$props) $$invalidate(22, key = $$props.key);
    		if ("closeButton" in $$props) $$invalidate(23, closeButton = $$props.closeButton);
    		if ("closeOnEsc" in $$props) $$invalidate(24, closeOnEsc = $$props.closeOnEsc);
    		if ("closeOnOuterClick" in $$props) $$invalidate(25, closeOnOuterClick = $$props.closeOnOuterClick);
    		if ("styleBg" in $$props) $$invalidate(26, styleBg = $$props.styleBg);
    		if ("styleWindowWrap" in $$props) $$invalidate(27, styleWindowWrap = $$props.styleWindowWrap);
    		if ("styleWindow" in $$props) $$invalidate(28, styleWindow = $$props.styleWindow);
    		if ("styleContent" in $$props) $$invalidate(29, styleContent = $$props.styleContent);
    		if ("styleCloseButton" in $$props) $$invalidate(30, styleCloseButton = $$props.styleCloseButton);
    		if ("setContext" in $$props) $$invalidate(31, setContext$1 = $$props.setContext);
    		if ("transitionBg" in $$props) $$invalidate(32, transitionBg = $$props.transitionBg);
    		if ("transitionBgProps" in $$props) $$invalidate(33, transitionBgProps = $$props.transitionBgProps);
    		if ("transitionWindow" in $$props) $$invalidate(34, transitionWindow = $$props.transitionWindow);
    		if ("transitionWindowProps" in $$props) $$invalidate(35, transitionWindowProps = $$props.transitionWindowProps);
    		if ("$$scope" in $$props) $$invalidate(37, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		bind,
    		svelte,
    		fade,
    		createEventDispatcher,
    		dispatch,
    		baseSetContext,
    		show,
    		key,
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindowWrap,
    		styleWindow,
    		styleContent,
    		styleCloseButton,
    		setContext: setContext$1,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps,
    		defaultState,
    		state,
    		Component,
    		background,
    		wrap,
    		modalWindow,
    		scrollY,
    		cssBg,
    		cssWindowWrap,
    		cssWindow,
    		cssContent,
    		cssCloseButton,
    		currentTransitionBg,
    		currentTransitionWindow,
    		prevBodyPosition,
    		prevBodyOverflow,
    		outerClickTarget,
    		camelCaseToDash,
    		toCssString,
    		isFunction,
    		updateStyleTransition,
    		toVoid,
    		onOpen,
    		onClose,
    		onOpened,
    		onClosed,
    		open,
    		close,
    		handleKeydown,
    		handleOuterMousedown,
    		handleOuterMouseup,
    		disableScroll,
    		enableScroll,
    		isMounted
    	});

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(21, show = $$props.show);
    		if ("key" in $$props) $$invalidate(22, key = $$props.key);
    		if ("closeButton" in $$props) $$invalidate(23, closeButton = $$props.closeButton);
    		if ("closeOnEsc" in $$props) $$invalidate(24, closeOnEsc = $$props.closeOnEsc);
    		if ("closeOnOuterClick" in $$props) $$invalidate(25, closeOnOuterClick = $$props.closeOnOuterClick);
    		if ("styleBg" in $$props) $$invalidate(26, styleBg = $$props.styleBg);
    		if ("styleWindowWrap" in $$props) $$invalidate(27, styleWindowWrap = $$props.styleWindowWrap);
    		if ("styleWindow" in $$props) $$invalidate(28, styleWindow = $$props.styleWindow);
    		if ("styleContent" in $$props) $$invalidate(29, styleContent = $$props.styleContent);
    		if ("styleCloseButton" in $$props) $$invalidate(30, styleCloseButton = $$props.styleCloseButton);
    		if ("setContext" in $$props) $$invalidate(31, setContext$1 = $$props.setContext);
    		if ("transitionBg" in $$props) $$invalidate(32, transitionBg = $$props.transitionBg);
    		if ("transitionBgProps" in $$props) $$invalidate(33, transitionBgProps = $$props.transitionBgProps);
    		if ("transitionWindow" in $$props) $$invalidate(34, transitionWindow = $$props.transitionWindow);
    		if ("transitionWindowProps" in $$props) $$invalidate(35, transitionWindowProps = $$props.transitionWindowProps);
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("Component" in $$props) $$invalidate(1, Component = $$props.Component);
    		if ("background" in $$props) $$invalidate(2, background = $$props.background);
    		if ("wrap" in $$props) $$invalidate(3, wrap = $$props.wrap);
    		if ("modalWindow" in $$props) $$invalidate(4, modalWindow = $$props.modalWindow);
    		if ("scrollY" in $$props) scrollY = $$props.scrollY;
    		if ("cssBg" in $$props) $$invalidate(5, cssBg = $$props.cssBg);
    		if ("cssWindowWrap" in $$props) $$invalidate(6, cssWindowWrap = $$props.cssWindowWrap);
    		if ("cssWindow" in $$props) $$invalidate(7, cssWindow = $$props.cssWindow);
    		if ("cssContent" in $$props) $$invalidate(8, cssContent = $$props.cssContent);
    		if ("cssCloseButton" in $$props) $$invalidate(9, cssCloseButton = $$props.cssCloseButton);
    		if ("currentTransitionBg" in $$props) $$invalidate(10, currentTransitionBg = $$props.currentTransitionBg);
    		if ("currentTransitionWindow" in $$props) $$invalidate(11, currentTransitionWindow = $$props.currentTransitionWindow);
    		if ("prevBodyPosition" in $$props) prevBodyPosition = $$props.prevBodyPosition;
    		if ("prevBodyOverflow" in $$props) prevBodyOverflow = $$props.prevBodyOverflow;
    		if ("outerClickTarget" in $$props) outerClickTarget = $$props.outerClickTarget;
    		if ("onOpen" in $$props) $$invalidate(12, onOpen = $$props.onOpen);
    		if ("onClose" in $$props) $$invalidate(13, onClose = $$props.onClose);
    		if ("onOpened" in $$props) $$invalidate(14, onOpened = $$props.onOpened);
    		if ("onClosed" in $$props) $$invalidate(15, onClosed = $$props.onClosed);
    		if ("isMounted" in $$props) $$invalidate(36, isMounted = $$props.isMounted);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*show*/ 2097152 | $$self.$$.dirty[1] & /*isMounted*/ 32) {
    			{
    				if (isMounted) {
    					if (isFunction(show)) {
    						open(show);
    					} else {
    						close();
    					}
    				}
    			}
    		}
    	};

    	return [
    		state,
    		Component,
    		background,
    		wrap,
    		modalWindow,
    		cssBg,
    		cssWindowWrap,
    		cssWindow,
    		cssContent,
    		cssCloseButton,
    		currentTransitionBg,
    		currentTransitionWindow,
    		onOpen,
    		onClose,
    		onOpened,
    		onClosed,
    		isFunction,
    		close,
    		handleKeydown,
    		handleOuterMousedown,
    		handleOuterMouseup,
    		show,
    		key,
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindowWrap,
    		styleWindow,
    		styleContent,
    		styleCloseButton,
    		setContext$1,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps,
    		isMounted,
    		$$scope,
    		slots,
    		div1_binding,
    		div2_binding,
    		div3_binding
    	];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$b,
    			create_fragment$b,
    			safe_not_equal,
    			{
    				show: 21,
    				key: 22,
    				closeButton: 23,
    				closeOnEsc: 24,
    				closeOnOuterClick: 25,
    				styleBg: 26,
    				styleWindowWrap: 27,
    				styleWindow: 28,
    				styleContent: 29,
    				styleCloseButton: 30,
    				setContext: 31,
    				transitionBg: 32,
    				transitionBgProps: 33,
    				transitionWindow: 34,
    				transitionWindowProps: 35
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get show() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get key() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get closeButton() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeButton(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get closeOnEsc() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeOnEsc(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get closeOnOuterClick() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set closeOnOuterClick(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleBg() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleBg(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleWindowWrap() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleWindowWrap(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleWindow() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleWindow(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleContent() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleContent(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleCloseButton() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleCloseButton(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setContext() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setContext(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionBg() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionBg(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionBgProps() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionBgProps(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionWindow() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionWindow(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get transitionWindowProps() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transitionWindowProps(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/About.svelte generated by Svelte v3.38.3 */

    const file$a = "src/pages/About.svelte";

    function create_fragment$a(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "ABOUT";
    			attr_dev(div0, "class", "title text m");
    			add_location(div0, file$a, 6, 2, 43);
    			attr_dev(div1, "class", "page");
    			add_location(div1, file$a, 5, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/components/Section.svelte generated by Svelte v3.38.3 */

    const file$9 = "src/components/Section.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "section svelte-1rjlnam");
    			set_style(div, "--bg-colour", /*colour*/ ctx[0]);
    			set_style(div, "height", /*height*/ ctx[1] + "vh");
    			add_location(div, file$9, 5, 0, 67);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*colour*/ 1) {
    				set_style(div, "--bg-colour", /*colour*/ ctx[0]);
    			}

    			if (!current || dirty & /*height*/ 2) {
    				set_style(div, "height", /*height*/ ctx[1] + "vh");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Section", slots, ['default']);
    	let { colour } = $$props;
    	let { height = 90 } = $$props;
    	const writable_props = ["colour", "height"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Section> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("colour" in $$props) $$invalidate(0, colour = $$props.colour);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ colour, height });

    	$$self.$inject_state = $$props => {
    		if ("colour" in $$props) $$invalidate(0, colour = $$props.colour);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [colour, height, $$scope, slots];
    }

    class Section extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { colour: 0, height: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Section",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*colour*/ ctx[0] === undefined && !("colour" in props)) {
    			console.warn("<Section> was created without expected prop 'colour'");
    		}
    	}

    	get colour() {
    		throw new Error("<Section>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colour(value) {
    		throw new Error("<Section>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Section>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Section>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Navbar.svelte generated by Svelte v3.38.3 */
    const file$8 = "src/components/Navbar.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (18:4) {#each links as link}
    function create_each_block$1(ctx) {
    	let div;
    	let t0_value = /*link*/ ctx[5] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[4](/*link*/ ctx[5]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "link svelte-4bjcum");
    			toggle_class(div, "active", /*$currentPage*/ ctx[0] == /*link*/ ctx[5]);
    			add_location(div, file$8, 18, 6, 322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$currentPage, links*/ 3) {
    				toggle_class(div, "active", /*$currentPage*/ ctx[0] == /*link*/ ctx[5]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(18:4) {#each links as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let nav;
    	let div0;
    	let t1;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value = /*links*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div0 = element("div");
    			div0.textContent = "NC";
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "brand m svelte-4bjcum");
    			add_location(div0, file$8, 10, 2, 182);
    			attr_dev(div1, "class", "links svelte-4bjcum");
    			add_location(div1, file$8, 16, 2, 270);
    			attr_dev(nav, "class", "svelte-4bjcum");
    			add_location(nav, file$8, 9, 0, 174);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div0);
    			append_dev(nav, t1);
    			append_dev(nav, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$currentPage, links, setCurrentPage*/ 7) {
    				each_value = /*links*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $currentPage;
    	validate_store(currentPage, "currentPage");
    	component_subscribe($$self, currentPage, $$value => $$invalidate(0, $currentPage = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", slots, []);
    	let links = ["Home", "Videos", "About"];

    	const setCurrentPage = page => {
    		set_store_value(currentPage, $currentPage = page, $currentPage);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setCurrentPage("Home");
    	const click_handler_1 = link => setCurrentPage(link);

    	$$self.$capture_state = () => ({
    		currentPage,
    		links,
    		setCurrentPage,
    		$currentPage
    	});

    	$$self.$inject_state = $$props => {
    		if ("links" in $$props) $$invalidate(1, links = $$props.links);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$currentPage, links, setCurrentPage, click_handler, click_handler_1];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var Sister;

    /**
    * @link https://github.com/gajus/sister for the canonical source repository
    * @license https://github.com/gajus/sister/blob/master/LICENSE BSD 3-Clause
    */
    Sister = function () {
        var sister = {},
            events = {};

        /**
         * @name handler
         * @function
         * @param {Object} data Event data.
         */

        /**
         * @param {String} name Event name.
         * @param {handler} handler
         * @return {listener}
         */
        sister.on = function (name, handler) {
            var listener = {name: name, handler: handler};
            events[name] = events[name] || [];
            events[name].unshift(listener);
            return listener;
        };

        /**
         * @param {listener}
         */
        sister.off = function (listener) {
            var index = events[listener.name].indexOf(listener);

            if (index !== -1) {
                events[listener.name].splice(index, 1);
            }
        };

        /**
         * @param {String} name Event name.
         * @param {Object} data Event data.
         */
        sister.trigger = function (name, data) {
            var listeners = events[name],
                i;

            if (listeners) {
                i = listeners.length;
                while (i--) {
                    listeners[i].handler(data);
                }
            }
        };

        return sister;
    };

    var sister = Sister;

    var loadScript = function load (src, opts, cb) {
      var head = document.head || document.getElementsByTagName('head')[0];
      var script = document.createElement('script');

      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }

      opts = opts || {};
      cb = cb || function() {};

      script.type = opts.type || 'text/javascript';
      script.charset = opts.charset || 'utf8';
      script.async = 'async' in opts ? !!opts.async : true;
      script.src = src;

      if (opts.attrs) {
        setAttributes(script, opts.attrs);
      }

      if (opts.text) {
        script.text = '' + opts.text;
      }

      var onend = 'onload' in script ? stdOnEnd : ieOnEnd;
      onend(script, cb);

      // some good legacy browsers (firefox) fail the 'in' detection above
      // so as a fallback we always set onload
      // old IE will ignore this and new IE will set onload
      if (!script.onload) {
        stdOnEnd(script, cb);
      }

      head.appendChild(script);
    };

    function setAttributes(script, attrs) {
      for (var attr in attrs) {
        script.setAttribute(attr, attrs[attr]);
      }
    }

    function stdOnEnd (script, cb) {
      script.onload = function () {
        this.onerror = this.onload = null;
        cb(null, script);
      };
      script.onerror = function () {
        // this.onload = null here is necessary
        // because even IE9 works not like others
        this.onerror = this.onload = null;
        cb(new Error('Failed to load ' + this.src), script);
      };
    }

    function ieOnEnd (script, cb) {
      script.onreadystatechange = function () {
        if (this.readyState != 'complete' && this.readyState != 'loaded') return
        this.onreadystatechange = null;
        cb(null, script); // there is no way to catch loading errors in IE8
      };
    }

    var loadYouTubeIframeApi = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });



    var _loadScript2 = _interopRequireDefault(loadScript);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.default = function (emitter) {
      /**
       * A promise that is resolved when window.onYouTubeIframeAPIReady is called.
       * The promise is resolved with a reference to window.YT object.
       */
      var iframeAPIReady = new Promise(function (resolve) {
        if (window.YT && window.YT.Player && window.YT.Player instanceof Function) {
          resolve(window.YT);

          return;
        } else {
          var protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';

          (0, _loadScript2.default)(protocol + '//www.youtube.com/iframe_api', function (error) {
            if (error) {
              emitter.trigger('error', error);
            }
          });
        }

        var previous = window.onYouTubeIframeAPIReady;

        // The API will call this function when page has finished downloading
        // the JavaScript for the player API.
        window.onYouTubeIframeAPIReady = function () {
          if (previous) {
            previous();
          }

          resolve(window.YT);
        };
      });

      return iframeAPIReady;
    };

    module.exports = exports['default'];
    });

    /**
     * Helpers.
     */
    var s = 1000;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var y = d * 365.25;

    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} [options]
     * @throws {Error} throw an error if val is not a non-empty string or a number
     * @return {String|Number}
     * @api public
     */

    var ms = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === 'string' && val.length > 0) {
        return parse(val);
      } else if (type === 'number' && isNaN(val) === false) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        'val is not a non-empty string or a valid number. val=' +
          JSON.stringify(val)
      );
    };

    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */

    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y;
        case 'days':
        case 'day':
        case 'd':
          return n * d;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n;
        default:
          return undefined;
      }
    }

    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtShort(ms) {
      if (ms >= d) {
        return Math.round(ms / d) + 'd';
      }
      if (ms >= h) {
        return Math.round(ms / h) + 'h';
      }
      if (ms >= m) {
        return Math.round(ms / m) + 'm';
      }
      if (ms >= s) {
        return Math.round(ms / s) + 's';
      }
      return ms + 'ms';
    }

    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */

    function fmtLong(ms) {
      return plural(ms, d, 'day') ||
        plural(ms, h, 'hour') ||
        plural(ms, m, 'minute') ||
        plural(ms, s, 'second') ||
        ms + ' ms';
    }

    /**
     * Pluralization helper.
     */

    function plural(ms, n, name) {
      if (ms < n) {
        return;
      }
      if (ms < n * 1.5) {
        return Math.floor(ms / n) + ' ' + name;
      }
      return Math.ceil(ms / n) + ' ' + name + 's';
    }

    var debug = createCommonjsModule(function (module, exports) {
    /**
     * This is the common logic for both the Node.js and web browser
     * implementations of `debug()`.
     *
     * Expose `debug()` as the module.
     */

    exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
    exports.coerce = coerce;
    exports.disable = disable;
    exports.enable = enable;
    exports.enabled = enabled;
    exports.humanize = ms;

    /**
     * The currently active debug mode names, and names to skip.
     */

    exports.names = [];
    exports.skips = [];

    /**
     * Map of special "%n" handling functions, for the debug "format" argument.
     *
     * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
     */

    exports.formatters = {};

    /**
     * Previous log timestamp.
     */

    var prevTime;

    /**
     * Select a color.
     * @param {String} namespace
     * @return {Number}
     * @api private
     */

    function selectColor(namespace) {
      var hash = 0, i;

      for (i in namespace) {
        hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }

      return exports.colors[Math.abs(hash) % exports.colors.length];
    }

    /**
     * Create a debugger with the given `namespace`.
     *
     * @param {String} namespace
     * @return {Function}
     * @api public
     */

    function createDebug(namespace) {

      function debug() {
        // disabled?
        if (!debug.enabled) return;

        var self = debug;

        // set `diff` timestamp
        var curr = +new Date();
        var ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;

        // turn the `arguments` into a proper Array
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }

        args[0] = exports.coerce(args[0]);

        if ('string' !== typeof args[0]) {
          // anything else let's inspect with %O
          args.unshift('%O');
        }

        // apply any `formatters` transformations
        var index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
          // if we encounter an escaped % then don't increase the array index
          if (match === '%%') return match;
          index++;
          var formatter = exports.formatters[format];
          if ('function' === typeof formatter) {
            var val = args[index];
            match = formatter.call(self, val);

            // now we need to remove `args[index]` since it's inlined in the `format`
            args.splice(index, 1);
            index--;
          }
          return match;
        });

        // apply env-specific formatting (colors, etc.)
        exports.formatArgs.call(self, args);

        var logFn = debug.log || exports.log || console.log.bind(console);
        logFn.apply(self, args);
      }

      debug.namespace = namespace;
      debug.enabled = exports.enabled(namespace);
      debug.useColors = exports.useColors();
      debug.color = selectColor(namespace);

      // env-specific initialization logic for debug instances
      if ('function' === typeof exports.init) {
        exports.init(debug);
      }

      return debug;
    }

    /**
     * Enables a debug mode by namespaces. This can include modes
     * separated by a colon and wildcards.
     *
     * @param {String} namespaces
     * @api public
     */

    function enable(namespaces) {
      exports.save(namespaces);

      exports.names = [];
      exports.skips = [];

      var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
      var len = split.length;

      for (var i = 0; i < len; i++) {
        if (!split[i]) continue; // ignore empty strings
        namespaces = split[i].replace(/\*/g, '.*?');
        if (namespaces[0] === '-') {
          exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
        } else {
          exports.names.push(new RegExp('^' + namespaces + '$'));
        }
      }
    }

    /**
     * Disable debug output.
     *
     * @api public
     */

    function disable() {
      exports.enable('');
    }

    /**
     * Returns true if the given mode name is enabled, false otherwise.
     *
     * @param {String} name
     * @return {Boolean}
     * @api public
     */

    function enabled(name) {
      var i, len;
      for (i = 0, len = exports.skips.length; i < len; i++) {
        if (exports.skips[i].test(name)) {
          return false;
        }
      }
      for (i = 0, len = exports.names.length; i < len; i++) {
        if (exports.names[i].test(name)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Coerce `val`.
     *
     * @param {Mixed} val
     * @return {Mixed}
     * @api private
     */

    function coerce(val) {
      if (val instanceof Error) return val.stack || val.message;
      return val;
    }
    });

    /**
     * This is the web browser implementation of `debug()`.
     *
     * Expose `debug()` as the module.
     */

    var browser = createCommonjsModule(function (module, exports) {
    exports = module.exports = debug;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = 'undefined' != typeof chrome
                   && 'undefined' != typeof chrome.storage
                      ? chrome.storage.local
                      : localstorage();

    /**
     * Colors.
     */

    exports.colors = [
      'lightseagreen',
      'forestgreen',
      'goldenrod',
      'dodgerblue',
      'darkorchid',
      'crimson'
    ];

    /**
     * Currently only WebKit-based Web Inspectors, Firefox >= v31,
     * and the Firebug extension (any Firefox version) are known
     * to support "%c" CSS customizations.
     *
     * TODO: add a `localStorage` variable to explicitly enable/disable colors
     */

    function useColors() {
      // NB: In an Electron preload script, document will be defined but not fully
      // initialized. Since we know we're in Chrome, we'll just detect this case
      // explicitly
      if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
        return true;
      }

      // is webkit? http://stackoverflow.com/a/16459606/376773
      // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
      return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
        // is firebug? http://stackoverflow.com/a/398120/376773
        (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
        // is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
        // double check webkit in userAgent just in case we are in a worker
        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
    }

    /**
     * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
     */

    exports.formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (err) {
        return '[UnexpectedJSONParseError]: ' + err.message;
      }
    };


    /**
     * Colorize log arguments if enabled.
     *
     * @api public
     */

    function formatArgs(args) {
      var useColors = this.useColors;

      args[0] = (useColors ? '%c' : '')
        + this.namespace
        + (useColors ? ' %c' : ' ')
        + args[0]
        + (useColors ? '%c ' : ' ')
        + '+' + exports.humanize(this.diff);

      if (!useColors) return;

      var c = 'color: ' + this.color;
      args.splice(1, 0, c, 'color: inherit');

      // the final "%c" is somewhat tricky, because there could be other
      // arguments passed either before or after the %c, so we need to
      // figure out the correct index to insert the CSS into
      var index = 0;
      var lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, function(match) {
        if ('%%' === match) return;
        index++;
        if ('%c' === match) {
          // we only are interested in the *last* %c
          // (the user may have provided their own)
          lastC = index;
        }
      });

      args.splice(lastC, 0, c);
    }

    /**
     * Invokes `console.log()` when available.
     * No-op when `console.log` is not a "function".
     *
     * @api public
     */

    function log() {
      // this hackery is required for IE8/9, where
      // the `console.log` function doesn't have 'apply'
      return 'object' === typeof console
        && console.log
        && Function.prototype.apply.call(console.log, console, arguments);
    }

    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */

    function save(namespaces) {
      try {
        if (null == namespaces) {
          exports.storage.removeItem('debug');
        } else {
          exports.storage.debug = namespaces;
        }
      } catch(e) {}
    }

    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */

    function load() {
      var r;
      try {
        r = exports.storage.debug;
      } catch(e) {}

      // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
      if (!r && typeof process !== 'undefined' && 'env' in process) {
        r = process.env.DEBUG;
      }

      return r;
    }

    /**
     * Enable namespaces listed in `localStorage.debug` initially.
     */

    exports.enable(load());

    /**
     * Localstorage attempts to return the localstorage.
     *
     * This is necessary because safari throws
     * when a user disables cookies/localstorage
     * and you attempt to access it.
     *
     * @return {LocalStorage}
     * @api private
     */

    function localstorage() {
      try {
        return window.localStorage;
      } catch (e) {}
    }
    });

    var functionNames = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });


    /**
     * @see https://developers.google.com/youtube/iframe_api_reference#Functions
     */
    exports.default = ['cueVideoById', 'loadVideoById', 'cueVideoByUrl', 'loadVideoByUrl', 'playVideo', 'pauseVideo', 'stopVideo', 'getVideoLoadedFraction', 'cuePlaylist', 'loadPlaylist', 'nextVideo', 'previousVideo', 'playVideoAt', 'setShuffle', 'setLoop', 'getPlaylist', 'getPlaylistIndex', 'setOption', 'mute', 'unMute', 'isMuted', 'setVolume', 'getVolume', 'seekTo', 'getPlayerState', 'getPlaybackRate', 'setPlaybackRate', 'getAvailablePlaybackRates', 'getPlaybackQuality', 'setPlaybackQuality', 'getAvailableQualityLevels', 'getCurrentTime', 'getDuration', 'removeEventListener', 'getVideoUrl', 'getVideoEmbedCode', 'getOptions', 'getOption', 'addEventListener', 'destroy', 'setSize', 'getIframe'];
    module.exports = exports['default'];
    });

    var eventNames = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });


    /**
     * @see https://developers.google.com/youtube/iframe_api_reference#Events
     * `volumeChange` is not officially supported but seems to work
     * it emits an object: `{volume: 82.6923076923077, muted: false}`
     */
    exports.default = ['ready', 'stateChange', 'playbackQualityChange', 'playbackRateChange', 'error', 'apiChange', 'volumeChange'];
    module.exports = exports['default'];
    });

    var PlayerStates = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = {
      BUFFERING: 3,
      ENDED: 0,
      PAUSED: 2,
      PLAYING: 1,
      UNSTARTED: -1,
      VIDEO_CUED: 5
    };
    module.exports = exports["default"];
    });

    var FunctionStateMap = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });



    var _PlayerStates2 = _interopRequireDefault(PlayerStates);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.default = {
      pauseVideo: {
        acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PAUSED],
        stateChangeRequired: false
      },
      playVideo: {
        acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PLAYING],
        stateChangeRequired: false
      },
      seekTo: {
        acceptableStates: [_PlayerStates2.default.ENDED, _PlayerStates2.default.PLAYING, _PlayerStates2.default.PAUSED],
        stateChangeRequired: true,

        // TRICKY: `seekTo` may not cause a state change if no buffering is
        // required.
        timeout: 3000
      }
    };
    module.exports = exports['default'];
    });

    var YouTubePlayer_1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });



    var _debug2 = _interopRequireDefault(browser);



    var _functionNames2 = _interopRequireDefault(functionNames);



    var _eventNames2 = _interopRequireDefault(eventNames);



    var _FunctionStateMap2 = _interopRequireDefault(FunctionStateMap);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /* eslint-disable promise/prefer-await-to-then */

    var debug = (0, _debug2.default)('youtube-player');

    var YouTubePlayer = {};

    /**
     * Construct an object that defines an event handler for all of the YouTube
     * player events. Proxy captured events through an event emitter.
     *
     * @todo Capture event parameters.
     * @see https://developers.google.com/youtube/iframe_api_reference#Events
     */
    YouTubePlayer.proxyEvents = function (emitter) {
      var events = {};

      var _loop = function _loop(eventName) {
        var onEventName = 'on' + eventName.slice(0, 1).toUpperCase() + eventName.slice(1);

        events[onEventName] = function (event) {
          debug('event "%s"', onEventName, event);

          emitter.trigger(eventName, event);
        };
      };

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _eventNames2.default[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var eventName = _step.value;

          _loop(eventName);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return events;
    };

    /**
     * Delays player API method execution until player state is ready.
     *
     * @todo Proxy all of the methods using Object.keys.
     * @todo See TRICKY below.
     * @param playerAPIReady Promise that resolves when player is ready.
     * @param strictState A flag designating whether or not to wait for
     * an acceptable state when calling supported functions.
     * @returns {Object}
     */
    YouTubePlayer.promisifyPlayer = function (playerAPIReady) {
      var strictState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var functions = {};

      var _loop2 = function _loop2(functionName) {
        if (strictState && _FunctionStateMap2.default[functionName]) {
          functions[functionName] = function () {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            return playerAPIReady.then(function (player) {
              var stateInfo = _FunctionStateMap2.default[functionName];
              var playerState = player.getPlayerState();

              // eslint-disable-next-line no-warning-comments
              // TODO: Just spread the args into the function once Babel is fixed:
              // https://github.com/babel/babel/issues/4270
              //
              // eslint-disable-next-line prefer-spread
              var value = player[functionName].apply(player, args);

              // TRICKY: For functions like `seekTo`, a change in state must be
              // triggered given that the resulting state could match the initial
              // state.
              if (stateInfo.stateChangeRequired ||

              // eslint-disable-next-line no-extra-parens
              Array.isArray(stateInfo.acceptableStates) && stateInfo.acceptableStates.indexOf(playerState) === -1) {
                return new Promise(function (resolve) {
                  var onPlayerStateChange = function onPlayerStateChange() {
                    var playerStateAfterChange = player.getPlayerState();

                    var timeout = void 0;

                    if (typeof stateInfo.timeout === 'number') {
                      timeout = setTimeout(function () {
                        player.removeEventListener('onStateChange', onPlayerStateChange);

                        resolve();
                      }, stateInfo.timeout);
                    }

                    if (Array.isArray(stateInfo.acceptableStates) && stateInfo.acceptableStates.indexOf(playerStateAfterChange) !== -1) {
                      player.removeEventListener('onStateChange', onPlayerStateChange);

                      clearTimeout(timeout);

                      resolve();
                    }
                  };

                  player.addEventListener('onStateChange', onPlayerStateChange);
                }).then(function () {
                  return value;
                });
              }

              return value;
            });
          };
        } else {
          functions[functionName] = function () {
            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            return playerAPIReady.then(function (player) {
              // eslint-disable-next-line no-warning-comments
              // TODO: Just spread the args into the function once Babel is fixed:
              // https://github.com/babel/babel/issues/4270
              //
              // eslint-disable-next-line prefer-spread
              return player[functionName].apply(player, args);
            });
          };
        }
      };

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _functionNames2.default[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var functionName = _step2.value;

          _loop2(functionName);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return functions;
    };

    exports.default = YouTubePlayer;
    module.exports = exports['default'];
    });

    var dist = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };



    var _sister2 = _interopRequireDefault(sister);



    var _loadYouTubeIframeApi2 = _interopRequireDefault(loadYouTubeIframeApi);



    var _YouTubePlayer2 = _interopRequireDefault(YouTubePlayer_1);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * @typedef YT.Player
     * @see https://developers.google.com/youtube/iframe_api_reference
     * */

    /**
     * @see https://developers.google.com/youtube/iframe_api_reference#Loading_a_Video_Player
     */
    var youtubeIframeAPI = void 0;

    /**
     * A factory function used to produce an instance of YT.Player and queue function calls and proxy events of the resulting object.
     *
     * @param maybeElementId Either An existing YT.Player instance,
     * the DOM element or the id of the HTML element where the API will insert an <iframe>.
     * @param options See `options` (Ignored when using an existing YT.Player instance).
     * @param strictState A flag designating whether or not to wait for
     * an acceptable state when calling supported functions. Default: `false`.
     * See `FunctionStateMap.js` for supported functions and acceptable states.
     */

    exports.default = function (maybeElementId) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var strictState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var emitter = (0, _sister2.default)();

      if (!youtubeIframeAPI) {
        youtubeIframeAPI = (0, _loadYouTubeIframeApi2.default)(emitter);
      }

      if (options.events) {
        throw new Error('Event handlers cannot be overwritten.');
      }

      if (typeof maybeElementId === 'string' && !document.getElementById(maybeElementId)) {
        throw new Error('Element "' + maybeElementId + '" does not exist.');
      }

      options.events = _YouTubePlayer2.default.proxyEvents(emitter);

      var playerAPIReady = new Promise(function (resolve) {
        if ((typeof maybeElementId === 'undefined' ? 'undefined' : _typeof(maybeElementId)) === 'object' && maybeElementId.playVideo instanceof Function) {
          var player = maybeElementId;

          resolve(player);
        } else {
          // asume maybeElementId can be rendered inside
          // eslint-disable-next-line promise/catch-or-return
          youtubeIframeAPI.then(function (YT) {
            // eslint-disable-line promise/prefer-await-to-then
            var player = new YT.Player(maybeElementId, options);

            emitter.on('ready', function () {
              resolve(player);
            });

            return null;
          });
        }
      });

      var playerApi = _YouTubePlayer2.default.promisifyPlayer(playerAPIReady, strictState);

      playerApi.on = emitter.on;
      playerApi.off = emitter.off;

      return playerApi;
    };

    module.exports = exports['default'];
    });

    var YoutubePlayer = /*@__PURE__*/getDefaultExportFromCjs(dist);

    /* node_modules/svelte-youtube/src/index.svelte generated by Svelte v3.38.3 */
    const file$7 = "node_modules/svelte-youtube/src/index.svelte";

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "id", /*id*/ ctx[0]);
    			add_location(div0, file$7, 143, 2, 4083);
    			attr_dev(div1, "class", /*className*/ ctx[1]);
    			add_location(div1, file$7, 142, 0, 4057);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			/*div0_binding*/ ctx[5](div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*id*/ 1) {
    				attr_dev(div0, "id", /*id*/ ctx[0]);
    			}

    			if (dirty & /*className*/ 2) {
    				attr_dev(div1, "class", /*className*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*div0_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const PlayerState = {
    	UNSTARTED: -1,
    	ENDED: 0,
    	PLAYING: 1,
    	PAUSED: 2,
    	BUFFERING: 3,
    	CUED: 5
    };

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Src", slots, []);
    	let { id = undefined } = $$props; // HTML element ID for player (optional)
    	let { videoId } = $$props; // Youtube video ID (required)
    	let { options = undefined } = $$props; // YouTube player options (optional)
    	let { class: className } = $$props; // HTML class names for container element
    	let playerElem; // player DOM element reference
    	let player; // player API instance

    	// Create and tear down player as component mounts or unmounts
    	onMount(() => createPlayer());

    	function createPlayer() {
    		player = YoutubePlayer(playerElem, options);

    		// Register event handlers
    		player.on("ready", onPlayerReady);

    		player.on("error", onPlayerError);
    		player.on("stateChange", onPlayerStateChange);
    		player.on("playbackRateChange", onPlayerPlaybackRateChange);
    		player.on("playbackQualityChange", onPlayerPlaybackQualityChange);

    		// Tear down player when done
    		return () => player.destroy();
    	}

    	function play(videoId) {
    		// this is needed because the loadVideoById function always starts playing,
    		// even if you have set autoplay to 1 whereas the cueVideoById function
    		// never starts autoplaying
    		if (player && videoId) {
    			if (options && options.playerVars && options.playerVars.autoplay === 1) {
    				player.loadVideoById(videoId);
    			} else {
    				player.cueVideoById(videoId);
    			}
    		}
    	}

    	// -------------------------------------------
    	// Event handling
    	// -------------------------------------------
    	const dispatch = createEventDispatcher();

    	/**
     * https://developers.google.com/youtube/iframe_api_reference#onReady
     *
     * @param {Object} event
     *   @param {Object} target - player object
     */
    	function onPlayerReady(event) {
    		dispatch("ready", event);

    		// Start playing
    		play(videoId);
    	}

    	/**
     * https://developers.google.com/youtube/iframe_api_reference#onError
     *
     * @param {Object} event
     *   @param {Integer} data  - error type
     *   @param {Object} target - player object
     */
    	function onPlayerError(event) {
    		dispatch("error", event);
    	}

    	/**
     * https://developers.google.com/youtube/iframe_api_reference#onStateChange
     *
     * @param {Object} event
     *   @param {Integer} data  - status change type
     *   @param {Object} target - actual YT player
     */
    	function onPlayerStateChange(event) {
    		dispatch("stateChange", event);

    		switch (event.data) {
    			case PlayerState.ENDED:
    				dispatch("end", event);
    				break;
    			case PlayerState.PLAYING:
    				dispatch("play", event);
    				break;
    			case PlayerState.PAUSED:
    				dispatch("pause", event);
    				break;
    		}
    	}

    	/**
     * https://developers.google.com/youtube/iframe_api_reference#onPlaybackRateChange
     *
     * @param {Object} event
     *   @param {Float} data    - playback rate
     *   @param {Object} target - actual YT player
     */
    	function onPlayerPlaybackRateChange(event) {
    		dispatch("playbackRateChange", event);
    	}

    	/**
     * https://developers.google.com/youtube/iframe_api_reference#onPlaybackQualityChange
     *
     * @param {Object} event
     *   @param {String} data   - playback quality
     *   @param {Object} target - actual YT player
     */
    	function onPlayerPlaybackQualityChange(event) {
    		dispatch("playbackQualityChange", event);
    	}

    	const writable_props = ["id", "videoId", "options", "class"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Src> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			playerElem = $$value;
    			$$invalidate(2, playerElem);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("videoId" in $$props) $$invalidate(3, videoId = $$props.videoId);
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    		if ("class" in $$props) $$invalidate(1, className = $$props.class);
    	};

    	$$self.$capture_state = () => ({
    		PlayerState,
    		onMount,
    		createEventDispatcher,
    		YoutubePlayer,
    		id,
    		videoId,
    		options,
    		className,
    		playerElem,
    		player,
    		createPlayer,
    		play,
    		dispatch,
    		onPlayerReady,
    		onPlayerError,
    		onPlayerStateChange,
    		onPlayerPlaybackRateChange,
    		onPlayerPlaybackQualityChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("videoId" in $$props) $$invalidate(3, videoId = $$props.videoId);
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    		if ("className" in $$props) $$invalidate(1, className = $$props.className);
    		if ("playerElem" in $$props) $$invalidate(2, playerElem = $$props.playerElem);
    		if ("player" in $$props) player = $$props.player;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*videoId*/ 8) {
    			// Update videoId and load new video if URL changes
    			play(videoId);
    		}
    	};

    	return [id, className, playerElem, videoId, options, div0_binding];
    }

    class Src extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { id: 0, videoId: 3, options: 4, class: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Src",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*videoId*/ ctx[3] === undefined && !("videoId" in props)) {
    			console.warn("<Src> was created without expected prop 'videoId'");
    		}

    		if (/*className*/ ctx[1] === undefined && !("class" in props)) {
    			console.warn("<Src> was created without expected prop 'class'");
    		}
    	}

    	get id() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get videoId() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set videoId(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/YouTubePreview.svelte generated by Svelte v3.38.3 */
    const file$6 = "src/components/YouTubePreview.svelte";

    // (35:2) {#if show }
    function create_if_block_1$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_intro;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", "youtube-preview");
    			if (img.src !== (img_src_value = "https://img.youtube.com/vi/" + /*videoId*/ ctx[0] + "/maxresdefault.jpg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$6, 35, 4, 785);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*videoId*/ 1 && img.src !== (img_src_value = "https://img.youtube.com/vi/" + /*videoId*/ ctx[0] + "/maxresdefault.jpg")) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (!img_intro) {
    				add_render_callback(() => {
    					img_intro = create_in_transition(img, fade, {});
    					img_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(35:2) {#if show }",
    		ctx
    	});

    	return block;
    }

    // (43:2) { #if category }
    function create_if_block$2(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*category*/ ctx[1]);
    			attr_dev(div, "class", "category svelte-om43nm");
    			add_location(div, file$6, 43, 4, 967);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*category*/ 2) set_data_dev(t, /*category*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(43:2) { #if category }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let div1_class_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*show*/ ctx[4] && create_if_block_1$1(ctx);
    	let if_block1 = /*category*/ ctx[1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "play svelte-om43nm");
    			add_location(div0, file$6, 41, 2, 919);
    			attr_dev(div1, "class", div1_class_value = "preview " + (/*border*/ ctx[2] ? " border" : "") + " svelte-om43nm");
    			attr_dev(div1, "style", /*tileStyle*/ ctx[3]);
    			add_location(div1, file$6, 30, 0, 662);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			if (if_block1) if_block1.m(div1, null);

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*show*/ 16) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*category*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*border*/ 4 && div1_class_value !== (div1_class_value = "preview " + (/*border*/ ctx[2] ? " border" : "") + " svelte-om43nm")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (dirty & /*tileStyle*/ 8) {
    				attr_dev(div1, "style", /*tileStyle*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block0);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("YouTubePreview", slots, []);
    	let { videoId } = $$props, { category } = $$props, { border } = $$props;
    	let { tileStyles = "" } = $$props;
    	let { tileWidth = "33.33%" } = $$props;
    	let { tileStyle = `width: ${tileWidth};` + tileStyles } = $$props;

    	const options = {
    		width: "1280",
    		height: "756",
    		playerVars: { autoplay: 1 }
    	};

    	const showModal = () => {
    		modal.set(bind(Src, { videoId, options }));
    	};

    	let show = false;

    	onMount(() => {
    		$$invalidate(4, show = true);
    	});

    	const writable_props = ["videoId", "category", "border", "tileStyles", "tileWidth", "tileStyle"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<YouTubePreview> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => showModal();

    	$$self.$$set = $$props => {
    		if ("videoId" in $$props) $$invalidate(0, videoId = $$props.videoId);
    		if ("category" in $$props) $$invalidate(1, category = $$props.category);
    		if ("border" in $$props) $$invalidate(2, border = $$props.border);
    		if ("tileStyles" in $$props) $$invalidate(6, tileStyles = $$props.tileStyles);
    		if ("tileWidth" in $$props) $$invalidate(7, tileWidth = $$props.tileWidth);
    		if ("tileStyle" in $$props) $$invalidate(3, tileStyle = $$props.tileStyle);
    	};

    	$$self.$capture_state = () => ({
    		modal,
    		onMount,
    		fade,
    		bind,
    		YouTube: Src,
    		videoId,
    		category,
    		border,
    		tileStyles,
    		tileWidth,
    		tileStyle,
    		options,
    		showModal,
    		show
    	});

    	$$self.$inject_state = $$props => {
    		if ("videoId" in $$props) $$invalidate(0, videoId = $$props.videoId);
    		if ("category" in $$props) $$invalidate(1, category = $$props.category);
    		if ("border" in $$props) $$invalidate(2, border = $$props.border);
    		if ("tileStyles" in $$props) $$invalidate(6, tileStyles = $$props.tileStyles);
    		if ("tileWidth" in $$props) $$invalidate(7, tileWidth = $$props.tileWidth);
    		if ("tileStyle" in $$props) $$invalidate(3, tileStyle = $$props.tileStyle);
    		if ("show" in $$props) $$invalidate(4, show = $$props.show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		videoId,
    		category,
    		border,
    		tileStyle,
    		show,
    		showModal,
    		tileStyles,
    		tileWidth,
    		click_handler
    	];
    }

    class YouTubePreview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			videoId: 0,
    			category: 1,
    			border: 2,
    			tileStyles: 6,
    			tileWidth: 7,
    			tileStyle: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "YouTubePreview",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*videoId*/ ctx[0] === undefined && !("videoId" in props)) {
    			console.warn("<YouTubePreview> was created without expected prop 'videoId'");
    		}

    		if (/*category*/ ctx[1] === undefined && !("category" in props)) {
    			console.warn("<YouTubePreview> was created without expected prop 'category'");
    		}

    		if (/*border*/ ctx[2] === undefined && !("border" in props)) {
    			console.warn("<YouTubePreview> was created without expected prop 'border'");
    		}
    	}

    	get videoId() {
    		throw new Error("<YouTubePreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set videoId(value) {
    		throw new Error("<YouTubePreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get category() {
    		throw new Error("<YouTubePreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set category(value) {
    		throw new Error("<YouTubePreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get border() {
    		throw new Error("<YouTubePreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set border(value) {
    		throw new Error("<YouTubePreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tileStyles() {
    		throw new Error("<YouTubePreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tileStyles(value) {
    		throw new Error("<YouTubePreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tileWidth() {
    		throw new Error("<YouTubePreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tileWidth(value) {
    		throw new Error("<YouTubePreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tileStyle() {
    		throw new Error("<YouTubePreview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tileStyle(value) {
    		throw new Error("<YouTubePreview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/FullVid.svelte generated by Svelte v3.38.3 */

    const file$5 = "src/components/FullVid.svelte";

    function create_fragment$5(ctx) {
    	let div2;
    	let video;
    	let track;
    	let video_src_value;
    	let t0;
    	let div1;
    	let progress;
    	let progress_value_value;
    	let t1;
    	let div0;
    	let span0;
    	let t2_value = format(/*time*/ ctx[0]) + "";
    	let t2;
    	let t3;
    	let span1;
    	let t7;
    	let span2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			video = element("video");
    			track = element("track");
    			t0 = space();
    			div1 = element("div");
    			progress = element("progress");
    			t1 = space();
    			div0 = element("div");
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = `click anywhere to ${/*paused*/ ctx[3] ? "play" : "pause"} / drag to seek`;
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = `${format(/*duration*/ ctx[2])}`;
    			attr_dev(track, "kind", "captions");
    			add_location(track, file$5, 62, 2, 1551);
    			attr_dev(video, "poster", "https://sveltejs.github.io/assets/caminandes-llamigos.jpg");
    			if (video.src !== (video_src_value = "https://sveltejs.github.io/assets/caminandes-llamigos.mp4")) attr_dev(video, "src", video_src_value);
    			video.autoplay = true;
    			video.muted = true;
    			attr_dev(video, "class", "svelte-3ry5q6");
    			add_location(video, file$5, 54, 1, 1310);
    			progress.value = progress_value_value = /*time*/ ctx[0] / /*duration*/ ctx[2] || 0;
    			attr_dev(progress, "class", "svelte-3ry5q6");
    			add_location(progress, file$5, 66, 2, 1664);
    			attr_dev(span0, "class", "time svelte-3ry5q6");
    			add_location(span0, file$5, 69, 3, 1734);
    			attr_dev(span1, "class", "svelte-3ry5q6");
    			add_location(span1, file$5, 70, 3, 1778);
    			attr_dev(span2, "class", "time svelte-3ry5q6");
    			add_location(span2, file$5, 71, 3, 1855);
    			attr_dev(div0, "class", "info svelte-3ry5q6");
    			add_location(div0, file$5, 68, 2, 1712);
    			attr_dev(div1, "class", "controls svelte-3ry5q6");
    			set_style(div1, "opacity", /*duration*/ ctx[2] && /*showControls*/ ctx[1] ? 1 : 0);
    			add_location(div1, file$5, 65, 1, 1587);
    			attr_dev(div2, "class", "svelte-3ry5q6");
    			add_location(div2, file$5, 53, 0, 1303);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, video);
    			append_dev(video, track);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, progress);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(div0, t7);
    			append_dev(div0, span2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(video, "mousemove", /*handleMousemove*/ ctx[4], false, false, false),
    					listen_dev(video, "mousedown", /*handleMousedown*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*time*/ 1 && progress_value_value !== (progress_value_value = /*time*/ ctx[0] / /*duration*/ ctx[2] || 0)) {
    				prop_dev(progress, "value", progress_value_value);
    			}

    			if (dirty & /*time*/ 1 && t2_value !== (t2_value = format(/*time*/ ctx[0]) + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*showControls*/ 2) {
    				set_style(div1, "opacity", /*duration*/ ctx[2] && /*showControls*/ ctx[1] ? 1 : 0);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function format(seconds) {
    	if (isNaN(seconds)) return "...";
    	const minutes = Math.floor(seconds / 60);
    	seconds = Math.floor(seconds % 60);
    	if (seconds < 10) seconds = "0" + seconds;
    	return `${minutes}:${seconds}`;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FullVid", slots, []);
    	let time = 0;
    	let duration;
    	let paused = true;
    	let showControls = true;
    	let showControlsTimeout;

    	function handleMousemove(e) {
    		// Make the controls visible, but fade out after
    		// 2.5 seconds of inactivity
    		clearTimeout(showControlsTimeout);

    		showControlsTimeout = setTimeout(() => $$invalidate(1, showControls = false), 2500);
    		$$invalidate(1, showControls = true);
    		if (!(e.buttons & 1)) return; // mouse not down
    		if (!duration) return; // video not loaded yet
    		const { left, right } = this.getBoundingClientRect();
    		$$invalidate(0, time = duration * (e.clientX - left) / (right - left));
    	}

    	function handleMousedown(e) {
    		// we can't rely on the built-in click event, because it fires
    		// after a drag — we have to listen for clicks ourselves
    		function handleMouseup() {
    			if (paused) e.target.play(); else e.target.pause();
    			cancel();
    		}

    		function cancel() {
    			e.target.removeEventListener("mouseup", handleMouseup);
    		}

    		e.target.addEventListener("mouseup", handleMouseup);
    		setTimeout(cancel, 200);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FullVid> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		time,
    		duration,
    		paused,
    		showControls,
    		showControlsTimeout,
    		handleMousemove,
    		handleMousedown,
    		format
    	});

    	$$self.$inject_state = $$props => {
    		if ("time" in $$props) $$invalidate(0, time = $$props.time);
    		if ("duration" in $$props) $$invalidate(2, duration = $$props.duration);
    		if ("paused" in $$props) $$invalidate(3, paused = $$props.paused);
    		if ("showControls" in $$props) $$invalidate(1, showControls = $$props.showControls);
    		if ("showControlsTimeout" in $$props) showControlsTimeout = $$props.showControlsTimeout;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [time, showControls, duration, paused, handleMousemove, handleMousedown];
    }

    class FullVid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FullVid",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/helpers/Icon.svelte generated by Svelte v3.38.3 */

    const file$4 = "src/helpers/Icon.svelte";

    function create_fragment$4(ctx) {
    	let svg;
    	let raw_value = /*displayIcon*/ ctx[4].svg + "";
    	let svg_class_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			attr_dev(svg, "class", svg_class_value = /*$$props*/ ctx[5].class);
    			attr_dev(svg, "fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "focusable", /*focusable*/ ctx[3]);
    			attr_dev(svg, "width", /*width*/ ctx[1]);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "viewBox", "0 0 " + /*displayIcon*/ ctx[4].box + " " + /*displayIcon*/ ctx[4].box);
    			add_location(svg, file$4, 32, 0, 2083);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			svg.innerHTML = raw_value;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$$props*/ 32 && svg_class_value !== (svg_class_value = /*$$props*/ ctx[5].class)) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty & /*fill*/ 1) {
    				attr_dev(svg, "fill", /*fill*/ ctx[0]);
    			}

    			if (dirty & /*focusable*/ 8) {
    				attr_dev(svg, "focusable", /*focusable*/ ctx[3]);
    			}

    			if (dirty & /*width*/ 2) {
    				attr_dev(svg, "width", /*width*/ ctx[1]);
    			}

    			if (dirty & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Icon", slots, []);
    	let { name } = $$props;
    	let { fill = "#212121" } = $$props;
    	let { width = "1em" } = $$props;
    	let { height = "1em" } = $$props;
    	let { focusable = false } = $$props;

    	let icons = [
    		{
    			// Google Icon - auto_fix_high
    			box: 24,
    			name: "advert",
    			svg: `<g><rect fill="none" height="24" width="24" x="0"/></g><g><g><polygon points="20,7 20.94,4.94 23,4 20.94,3.06 20,1 19.06,3.06 17,4 19.06,4.94"/><polygon points="8.5,7 9.44,4.94 11.5,4 9.44,3.06 8.5,1 7.56,3.06 5.5,4 7.56,4.94"/><polygon points="20,12.5 19.06,14.56 17,15.5 19.06,16.44 20,18.5 20.94,16.44 23,15.5 20.94,14.56"/><path d="M17.71,9.12l-2.83-2.83C14.68,6.1,14.43,6,14.17,6c-0.26,0-0.51,0.1-0.71,0.29L2.29,17.46c-0.39,0.39-0.39,1.02,0,1.41 l2.83,2.83C5.32,21.9,5.57,22,5.83,22s0.51-0.1,0.71-0.29l11.17-11.17C18.1,10.15,18.1,9.51,17.71,9.12z M14.17,8.42l1.41,1.41 L14.41,11L13,9.59L14.17,8.42z M5.83,19.59l-1.41-1.41L11.59,11L13,12.41L5.83,19.59z"/></g></g>`
    		},
    		{
    			// Google Icon - featured_video
    			box: 24,
    			name: "webclass",
    			svg: `<path d="M0 0h24v24H0V0z" fill="none"/><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM4 6h9v7H4z"/>`
    		},
    		{
    			// Google Icon - music_video
    			box: 24,
    			name: "music",
    			svg: `<path d="M0 0h24v24H0V0z" fill="none"/><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03c-.02 1.64-1.35 2.97-3 2.97-1.66 0-3-1.34-3-3z"/>`
    		},
    		{
    			// Google Icon - video_camera_front
    			box: 24,
    			name: "testimony",
    			svg: `<g><rect fill="none" height="24" width="24"/></g><g><g><path d="M18,10.48V6c0-1.1-0.9-2-2-2H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-4.48l4,3.98v-11L18,10.48z M16,9.69V18H4V6h12V9.69z"/><circle cx="10" cy="10" r="2"/><path d="M14,15.43c0-0.81-0.48-1.53-1.22-1.85C11.93,13.21,10.99,13,10,13c-0.99,0-1.93,0.21-2.78,0.58C6.48,13.9,6,14.62,6,15.43 V16h8V15.43z"/></g></g>`
    		}
    	];

    	let displayIcon = icons.find(e => e.name === name);

    	$$self.$$set = $$new_props => {
    		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("name" in $$new_props) $$invalidate(6, name = $$new_props.name);
    		if ("fill" in $$new_props) $$invalidate(0, fill = $$new_props.fill);
    		if ("width" in $$new_props) $$invalidate(1, width = $$new_props.width);
    		if ("height" in $$new_props) $$invalidate(2, height = $$new_props.height);
    		if ("focusable" in $$new_props) $$invalidate(3, focusable = $$new_props.focusable);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		fill,
    		width,
    		height,
    		focusable,
    		icons,
    		displayIcon
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(5, $$props = assign(assign({}, $$props), $$new_props));
    		if ("name" in $$props) $$invalidate(6, name = $$new_props.name);
    		if ("fill" in $$props) $$invalidate(0, fill = $$new_props.fill);
    		if ("width" in $$props) $$invalidate(1, width = $$new_props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$new_props.height);
    		if ("focusable" in $$props) $$invalidate(3, focusable = $$new_props.focusable);
    		if ("icons" in $$props) icons = $$new_props.icons;
    		if ("displayIcon" in $$props) $$invalidate(4, displayIcon = $$new_props.displayIcon);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [fill, width, height, focusable, displayIcon, $$props, name];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			name: 6,
    			fill: 0,
    			width: 1,
    			height: 2,
    			focusable: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[6] === undefined && !("name" in props)) {
    			console.warn("<Icon> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fill() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get focusable() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set focusable(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/helpers/PageTransition.svelte generated by Svelte v3.38.3 */
    const file$3 = "src/helpers/PageTransition.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let div_intro;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$3, 10, 0, 234);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fly, {
    						x: -/*x*/ ctx[0],
    						y: -/*y*/ ctx[1],
    						duration: 500,
    						easing: expoOut
    					});

    					div_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PageTransition", slots, ['default']);
    	let { x = screen.width } = $$props;
    	let { y = 0 } = $$props;
    	onMount(() => window.scrollTo(0, 0));
    	const writable_props = ["x", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PageTransition> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ onMount, fly, expoOut, x, y });

    	$$self.$inject_state = $$props => {
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [x, y, $$scope, slots];
    }

    class PageTransition extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { x: 0, y: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PageTransition",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get x() {
    		throw new Error("<PageTransition>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<PageTransition>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<PageTransition>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<PageTransition>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/Home.svelte generated by Svelte v3.38.3 */
    const file$2 = "src/pages/Home.svelte";

    // (19:4) {#if visible}
    function create_if_block$1(ctx) {
    	let div4;
    	let div1;
    	let div0;
    	let t0;
    	let br0;
    	let t1;
    	let t2;
    	let div3;
    	let div2;
    	let t3;
    	let br1;
    	let t4;
    	let div4_intro;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text("NIKKI ");
    			br0 = element("br");
    			t1 = text(" CADIZ");
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t3 = text("VIDEO ");
    			br1 = element("br");
    			t4 = text(" EDITOR");
    			add_location(br0, file$2, 21, 34, 637);
    			attr_dev(div0, "class", "name");
    			add_location(div0, file$2, 21, 10, 613);
    			attr_dev(div1, "class", "half left svelte-1jsqkj0");
    			add_location(div1, file$2, 20, 8, 579);
    			add_location(br1, file$2, 25, 33, 736);
    			attr_dev(div2, "class", "job");
    			add_location(div2, file$2, 25, 10, 713);
    			attr_dev(div3, "class", "half right svelte-1jsqkj0");
    			add_location(div3, file$2, 24, 8, 678);
    			attr_dev(div4, "class", "me text r svelte-1jsqkj0");
    			add_location(div4, file$2, 19, 6, 518);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, br0);
    			append_dev(div0, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, t3);
    			append_dev(div2, br1);
    			append_dev(div2, t4);
    		},
    		i: function intro(local) {
    			if (!div4_intro) {
    				add_render_callback(() => {
    					div4_intro = create_in_transition(div4, fade, { duration: 1000 });
    					div4_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(19:4) {#if visible}",
    		ctx
    	});

    	return block;
    }

    // (18:2) <Section colour='#212121' height='95'>
    function create_default_slot_4(ctx) {
    	let if_block_anchor;
    	let if_block = /*visible*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*visible*/ ctx[0]) {
    				if (if_block) {
    					if (dirty & /*visible*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(18:2) <Section colour='#212121' height='95'>",
    		ctx
    	});

    	return block;
    }

    // (31:2) <Section colour='#212121' height='100'>
    function create_default_slot_3(ctx) {
    	let fullvid;
    	let current;
    	fullvid = new FullVid({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(fullvid.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fullvid, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fullvid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fullvid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fullvid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(31:2) <Section colour='#212121' height='100'>",
    		ctx
    	});

    	return block;
    }

    // (35:2) <Section colour='#EFEFEF' height='65'>
    function create_default_slot_2(ctx) {
    	let div7;
    	let div0;
    	let t1;
    	let div5;
    	let div1;
    	let icon0;
    	let t2;
    	let span0;
    	let t4;
    	let div2;
    	let icon1;
    	let t5;
    	let span1;
    	let t7;
    	let div3;
    	let icon2;
    	let t8;
    	let span2;
    	let t10;
    	let div4;
    	let icon3;
    	let t11;
    	let span3;
    	let t13;
    	let div6;
    	let t15;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	icon0 = new Icon({
    			props: { name: "testimony" },
    			$$inline: true
    		});

    	icon1 = new Icon({
    			props: { name: "advert" },
    			$$inline: true
    		});

    	icon2 = new Icon({ props: { name: "music" }, $$inline: true });

    	icon3 = new Icon({
    			props: { name: "webclass" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			div0.textContent = "I edit...";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			create_component(icon0.$$.fragment);
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "TESTIMONIALS";
    			t4 = space();
    			div2 = element("div");
    			create_component(icon1.$$.fragment);
    			t5 = space();
    			span1 = element("span");
    			span1.textContent = "ADVERTISEMENTS";
    			t7 = space();
    			div3 = element("div");
    			create_component(icon2.$$.fragment);
    			t8 = space();
    			span2 = element("span");
    			span2.textContent = "MUSIC VIDEOS";
    			t10 = space();
    			div4 = element("div");
    			create_component(icon3.$$.fragment);
    			t11 = space();
    			span3 = element("span");
    			span3.textContent = "WEBCLASSES";
    			t13 = space();
    			div6 = element("div");
    			div6.textContent = "... and more!";
    			t15 = space();
    			button = element("button");
    			button.textContent = "VIEW PORTFOLIO";
    			attr_dev(div0, "class", "intro svelte-1jsqkj0");
    			add_location(div0, file$2, 36, 6, 963);
    			attr_dev(span0, "class", "svelte-1jsqkj0");
    			add_location(span0, file$2, 40, 10, 1089);
    			attr_dev(div1, "class", "svelte-1jsqkj0");
    			add_location(div1, file$2, 38, 8, 1037);
    			attr_dev(span1, "class", "svelte-1jsqkj0");
    			add_location(span1, file$2, 44, 10, 1187);
    			attr_dev(div2, "class", "svelte-1jsqkj0");
    			add_location(div2, file$2, 42, 8, 1138);
    			attr_dev(span2, "class", "svelte-1jsqkj0");
    			add_location(span2, file$2, 48, 10, 1286);
    			attr_dev(div3, "class", "svelte-1jsqkj0");
    			add_location(div3, file$2, 46, 8, 1238);
    			attr_dev(span3, "class", "svelte-1jsqkj0");
    			add_location(span3, file$2, 52, 10, 1386);
    			attr_dev(div4, "class", "svelte-1jsqkj0");
    			add_location(div4, file$2, 50, 8, 1335);
    			attr_dev(div5, "class", "categories svelte-1jsqkj0");
    			add_location(div5, file$2, 37, 6, 1004);
    			attr_dev(div6, "class", "intro svelte-1jsqkj0");
    			add_location(div6, file$2, 55, 6, 1444);
    			attr_dev(button, "class", "svelte-1jsqkj0");
    			add_location(button, file$2, 56, 6, 1489);
    			attr_dev(div7, "class", "can-do itext svelte-1jsqkj0");
    			add_location(div7, file$2, 35, 4, 930);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div7, t1);
    			append_dev(div7, div5);
    			append_dev(div5, div1);
    			mount_component(icon0, div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, span0);
    			append_dev(div5, t4);
    			append_dev(div5, div2);
    			mount_component(icon1, div2, null);
    			append_dev(div2, t5);
    			append_dev(div2, span1);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			mount_component(icon2, div3, null);
    			append_dev(div3, t8);
    			append_dev(div3, span2);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			mount_component(icon3, div4, null);
    			append_dev(div4, t11);
    			append_dev(div4, span3);
    			append_dev(div7, t13);
    			append_dev(div7, div6);
    			append_dev(div7, t15);
    			append_dev(div7, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			transition_in(icon2.$$.fragment, local);
    			transition_in(icon3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			transition_out(icon2.$$.fragment, local);
    			transition_out(icon3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			destroy_component(icon0);
    			destroy_component(icon1);
    			destroy_component(icon2);
    			destroy_component(icon3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(35:2) <Section colour='#EFEFEF' height='65'>",
    		ctx
    	});

    	return block;
    }

    // (61:2) <Section colour='#212121' height='65'>
    function create_default_slot_1$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "I am NIKKI CADIZ, a freelance video editor based in the Philippines. I am available for both short-term and long-term projects.";
    			attr_dev(div, "class", "bio text svelte-1jsqkj0");
    			add_location(div, file$2, 61, 4, 1633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(61:2) <Section colour='#212121' height='65'>",
    		ctx
    	});

    	return block;
    }

    // (67:2) <Section colour='#EFEFEF' height='75'>
    function create_default_slot$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "LET'S WORK TOGETHER!";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "nikkitries@gmail.com";
    			attr_dev(div0, "class", "work c svelte-1jsqkj0");
    			add_location(div0, file$2, 68, 6, 1894);
    			attr_dev(div1, "class", "email r");
    			add_location(div1, file$2, 69, 6, 1947);
    			attr_dev(div2, "class", "contact itext svelte-1jsqkj0");
    			add_location(div2, file$2, 67, 4, 1860);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(67:2) <Section colour='#EFEFEF' height='75'>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let section0;
    	let t0;
    	let section1;
    	let t1;
    	let section2;
    	let t2;
    	let section3;
    	let t3;
    	let section4;
    	let current;

    	section0 = new Section({
    			props: {
    				colour: "#212121",
    				height: "95",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	section1 = new Section({
    			props: {
    				colour: "#212121",
    				height: "100",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	section2 = new Section({
    			props: {
    				colour: "#EFEFEF",
    				height: "65",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	section3 = new Section({
    			props: {
    				colour: "#212121",
    				height: "65",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	section4 = new Section({
    			props: {
    				colour: "#EFEFEF",
    				height: "75",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(section0.$$.fragment);
    			t0 = space();
    			create_component(section1.$$.fragment);
    			t1 = space();
    			create_component(section2.$$.fragment);
    			t2 = space();
    			create_component(section3.$$.fragment);
    			t3 = space();
    			create_component(section4.$$.fragment);
    			add_location(div, file$2, 14, 0, 362);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(section0, div, null);
    			append_dev(div, t0);
    			mount_component(section1, div, null);
    			append_dev(div, t1);
    			mount_component(section2, div, null);
    			append_dev(div, t2);
    			mount_component(section3, div, null);
    			append_dev(div, t3);
    			mount_component(section4, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const section0_changes = {};

    			if (dirty & /*$$scope, visible*/ 17) {
    				section0_changes.$$scope = { dirty, ctx };
    			}

    			section0.$set(section0_changes);
    			const section1_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				section1_changes.$$scope = { dirty, ctx };
    			}

    			section1.$set(section1_changes);
    			const section2_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				section2_changes.$$scope = { dirty, ctx };
    			}

    			section2.$set(section2_changes);
    			const section3_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				section3_changes.$$scope = { dirty, ctx };
    			}

    			section3.$set(section3_changes);
    			const section4_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				section4_changes.$$scope = { dirty, ctx };
    			}

    			section4.$set(section4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(section0.$$.fragment, local);
    			transition_in(section1.$$.fragment, local);
    			transition_in(section2.$$.fragment, local);
    			transition_in(section3.$$.fragment, local);
    			transition_in(section4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(section0.$$.fragment, local);
    			transition_out(section1.$$.fragment, local);
    			transition_out(section2.$$.fragment, local);
    			transition_out(section3.$$.fragment, local);
    			transition_out(section4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(section0);
    			destroy_component(section1);
    			destroy_component(section2);
    			destroy_component(section3);
    			destroy_component(section4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $currentPage;
    	validate_store(currentPage, "currentPage");
    	component_subscribe($$self, currentPage, $$value => $$invalidate(3, $currentPage = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let visible = false;
    	const setCurrentPage = page => set_store_value(currentPage, $currentPage = page, $currentPage);

    	onMount(async () => {
    		$$invalidate(0, visible = true);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setCurrentPage("Videos");

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		Section,
    		FullVid,
    		currentPage,
    		Icon,
    		visible,
    		setCurrentPage,
    		$currentPage
    	});

    	$$self.$inject_state = $$props => {
    		if ("visible" in $$props) $$invalidate(0, visible = $$props.visible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [visible, setCurrentPage, click_handler];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/pages/Videos.svelte generated by Svelte v3.38.3 */
    const file$1 = "src/pages/Videos.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i].id;
    	child_ctx[8] = list[i].category;
    	child_ctx[9] = list;
    	child_ctx[10] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (43:6) {#each categories as category}
    function create_each_block_1(ctx) {
    	let div;
    	let t0_value = /*category*/ ctx[8] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*category*/ ctx[8]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "filter r svelte-1k1ajdr");
    			toggle_class(div, "active", /*filter*/ ctx[0] == /*category*/ ctx[8]);
    			add_location(div, file$1, 43, 8, 899);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*filter, categories*/ 5) {
    				toggle_class(div, "active", /*filter*/ ctx[0] == /*category*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(43:6) {#each categories as category}",
    		ctx
    	});

    	return block;
    }

    // (55:4) {#each filteredList as { id, category }}
    function create_each_block(ctx) {
    	let youtubepreview;
    	let updating_videoId;
    	let current;

    	function youtubepreview_videoId_binding(value) {
    		/*youtubepreview_videoId_binding*/ ctx[5](value, /*id*/ ctx[7], /*each_value*/ ctx[9], /*each_index*/ ctx[10]);
    	}

    	let youtubepreview_props = {
    		category: /*category*/ ctx[8],
    		tileWidth: "25%",
    		tileStyles: "margin: 1.5em;"
    	};

    	if (/*id*/ ctx[7] !== void 0) {
    		youtubepreview_props.videoId = /*id*/ ctx[7];
    	}

    	youtubepreview = new YouTubePreview({
    			props: youtubepreview_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind$1(youtubepreview, "videoId", youtubepreview_videoId_binding));

    	const block = {
    		c: function create() {
    			create_component(youtubepreview.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(youtubepreview, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const youtubepreview_changes = {};
    			if (dirty & /*filteredList*/ 2) youtubepreview_changes.category = /*category*/ ctx[8];

    			if (!updating_videoId && dirty & /*filteredList*/ 2) {
    				updating_videoId = true;
    				youtubepreview_changes.videoId = /*id*/ ctx[7];
    				add_flush_callback(() => updating_videoId = false);
    			}

    			youtubepreview.$set(youtubepreview_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(youtubepreview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(youtubepreview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(youtubepreview, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(55:4) {#each filteredList as { id, category }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let div2;
    	let current;
    	let each_value_1 = /*categories*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*filteredList*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div1 = element("div");
    			t0 = text("VIDEOS\n\n    ");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "filters svelte-1k1ajdr");
    			add_location(div0, file$1, 41, 4, 832);
    			attr_dev(div1, "class", "title text c svelte-1k1ajdr");
    			add_location(div1, file$1, 38, 2, 789);
    			attr_dev(div2, "class", "videos svelte-1k1ajdr");
    			add_location(div2, file$1, 53, 2, 1095);
    			attr_dev(div3, "class", "page");
    			add_location(div3, file$1, 37, 0, 768);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, t0);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div3, t1);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*filter, categories, setFilter*/ 13) {
    				each_value_1 = /*categories*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*filteredList*/ 2) {
    				each_value = /*filteredList*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let filteredList;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Videos", slots, []);

    	let videos = [
    		{
    			id: "cQIaYLXR2BA",
    			category: "Promotional"
    		},
    		{
    			id: "Rh5tEDUxric",
    			category: "Educational"
    		},
    		{
    			id: "47c5PGlduA8",
    			category: "Entertainment"
    		},
    		{
    			id: "2_U3J70OsDQ",
    			category: "Promotional"
    		},
    		{
    			id: "ei8vJa4c-RA",
    			category: "Educational"
    		},
    		{
    			id: "GJfnS7sLfJk",
    			category: "Entertainment"
    		}
    	];

    	let categories = ["Promotional", "Educational", "Entertainment"];
    	let filter = "";

    	const setFilter = q => {
    		if (filter == q) {
    			$$invalidate(0, filter = "");
    		} else {
    			$$invalidate(0, filter = q);
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Videos> was created with unknown prop '${key}'`);
    	});

    	const click_handler = category => setFilter(category);

    	function youtubepreview_videoId_binding(value, id, each_value, each_index) {
    		each_value[each_index].id = value;
    		(($$invalidate(1, filteredList), $$invalidate(6, videos)), $$invalidate(0, filter));
    	}

    	$$self.$capture_state = () => ({
    		YouTubePreview,
    		videos,
    		categories,
    		filter,
    		setFilter,
    		filteredList
    	});

    	$$self.$inject_state = $$props => {
    		if ("videos" in $$props) $$invalidate(6, videos = $$props.videos);
    		if ("categories" in $$props) $$invalidate(2, categories = $$props.categories);
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    		if ("filteredList" in $$props) $$invalidate(1, filteredList = $$props.filteredList);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*filter*/ 1) {
    			$$invalidate(1, filteredList = videos.filter(video => video.category.indexOf(filter) !== -1));
    		}
    	};

    	return [
    		filter,
    		filteredList,
    		categories,
    		setFilter,
    		click_handler,
    		youtubepreview_videoId_binding
    	];
    }

    class Videos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Videos",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */
    const file = "src/App.svelte";

    // (19:37) 
    function create_if_block_2(ctx) {
    	let pagetransition;
    	let current;

    	pagetransition = new PageTransition({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(pagetransition.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(pagetransition, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pagetransition.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pagetransition.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(pagetransition, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(19:37) ",
    		ctx
    	});

    	return block;
    }

    // (15:36) 
    function create_if_block_1(ctx) {
    	let pagetransition;
    	let current;

    	pagetransition = new PageTransition({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(pagetransition.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(pagetransition, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pagetransition.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pagetransition.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(pagetransition, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:36) ",
    		ctx
    	});

    	return block;
    }

    // (13:1) {#if $currentPage === 'Home'}
    function create_if_block(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(13:1) {#if $currentPage === 'Home'}",
    		ctx
    	});

    	return block;
    }

    // (20:2) <PageTransition>
    function create_default_slot_1(ctx) {
    	let videos;
    	let current;
    	videos = new Videos({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(videos.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(videos, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(videos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(videos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(videos, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(20:2) <PageTransition>",
    		ctx
    	});

    	return block;
    }

    // (16:2) <PageTransition>
    function create_default_slot(ctx) {
    	let about;
    	let current;
    	about = new About({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(about.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(about, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(about, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(16:2) <PageTransition>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let modal_1;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$currentPage*/ ctx[0] === "Home") return 0;
    		if (/*$currentPage*/ ctx[0] === "About") return 1;
    		if (/*$currentPage*/ ctx[0] === "Videos") return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	modal_1 = new Modal({
    			props: {
    				show: /*$modal*/ ctx[1],
    				styleWindow: {
    					width: "auto",
    					textAlign: "center",
    					backgroundColor: "black"
    				},
    				styleContent: { padding: 0 }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			create_component(modal_1.$$.fragment);
    			add_location(main, file, 9, 0, 246);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(main, null);
    			}

    			append_dev(main, t1);
    			mount_component(modal_1, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(main, t1);
    				} else {
    					if_block = null;
    				}
    			}

    			const modal_1_changes = {};
    			if (dirty & /*$modal*/ 2) modal_1_changes.show = /*$modal*/ ctx[1];
    			modal_1.$set(modal_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(modal_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(modal_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			destroy_component(modal_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $currentPage;
    	let $modal;
    	validate_store(currentPage, "currentPage");
    	component_subscribe($$self, currentPage, $$value => $$invalidate(0, $currentPage = $$value));
    	validate_store(modal, "modal");
    	component_subscribe($$self, modal, $$value => $$invalidate(1, $modal = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		currentPage,
    		modal,
    		Modal,
    		About,
    		Home,
    		Videos,
    		Navbar,
    		PageTransition,
    		$currentPage,
    		$modal
    	});

    	return [$currentPage, $modal];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
