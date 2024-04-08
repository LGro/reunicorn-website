let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedBigInt64Memory0 = null;

function getBigInt64Memory0() {
    if (cachedBigInt64Memory0 === null || cachedBigInt64Memory0.byteLength === 0) {
        cachedBigInt64Memory0 = new BigInt64Array(wasm.memory.buffer);
    }
    return cachedBigInt64Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b)
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}
function __wbg_adapter_50(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures__invoke1_mut__hdb5b5ad0b05faa23(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_53(arg0, arg1) {
    wasm.wasm_bindgen__convert__closures__invoke0_mut__h444e61a53337f3a3(arg0, arg1);
}

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
function __wbg_adapter_56(arg0, arg1, arg2) {
    try {
        wasm._dyn_core__ops__function__FnMut___A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hfc472dba2441f5ed(arg0, arg1, addBorrowedObject(arg2));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

function __wbg_adapter_59(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__he6689a8fdbc87162(arg0, arg1);
}

function __wbg_adapter_62(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures__invoke1_mut__hc8c071e01b64bda9(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_65(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures__invoke1_mut__h0bf2a167f13f4c03(arg0, arg1, addHeapObject(arg2));
}

/**
*/
export function initialize_veilid_wasm() {
    wasm.initialize_veilid_wasm();
}

/**
* @param {string} platform_config
*/
export function initialize_veilid_core(platform_config) {
    const ptr0 = passStringToWasm0(platform_config, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.initialize_veilid_core(ptr0, len0);
}

/**
* @param {string} layer
* @param {string} log_level
*/
export function change_log_level(layer, log_level) {
    const ptr0 = passStringToWasm0(layer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(log_level, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.change_log_level(ptr0, len0, ptr1, len1);
}

/**
* @param {string} layer
* @param {string} log_ignore
*/
export function change_log_ignore(layer, log_ignore) {
    const ptr0 = passStringToWasm0(layer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(log_ignore, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.change_log_ignore(ptr0, len0, ptr1, len1);
}

/**
* @param {Function} update_callback_js
* @param {string} json_config
* @returns {Promise<any>}
*/
export function startup_veilid_core(update_callback_js, json_config) {
    const ptr0 = passStringToWasm0(json_config, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.startup_veilid_core(addHeapObject(update_callback_js), ptr0, len0);
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function get_veilid_state() {
    const ret = wasm.get_veilid_state();
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function attach() {
    const ret = wasm.attach();
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function detach() {
    const ret = wasm.detach();
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function shutdown_veilid_core() {
    const ret = wasm.shutdown_veilid_core();
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function routing_context() {
    const ret = wasm.routing_context();
    return takeObject(ret);
}

/**
* @param {number} id
* @returns {number}
*/
export function release_routing_context(id) {
    const ret = wasm.release_routing_context(id);
    return ret;
}

/**
* @param {number} id
* @returns {number}
*/
export function routing_context_with_default_safety(id) {
    const ret = wasm.routing_context_with_default_safety(id);
    return ret >>> 0;
}

/**
* @param {number} id
* @param {string} safety_selection
* @returns {number}
*/
export function routing_context_with_safety(id, safety_selection) {
    const ptr0 = passStringToWasm0(safety_selection, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_with_safety(id, ptr0, len0);
    return ret >>> 0;
}

/**
* @param {number} id
* @param {string} sequencing
* @returns {number}
*/
export function routing_context_with_sequencing(id, sequencing) {
    const ptr0 = passStringToWasm0(sequencing, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_with_sequencing(id, ptr0, len0);
    return ret >>> 0;
}

/**
* @param {number} id
* @returns {Promise<any>}
*/
export function routing_context_safety(id) {
    const ret = wasm.routing_context_safety(id);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} target_string
* @param {string} request
* @returns {Promise<any>}
*/
export function routing_context_app_call(id, target_string, request) {
    const ptr0 = passStringToWasm0(target_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(request, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_app_call(id, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} target_string
* @param {string} message
* @returns {Promise<any>}
*/
export function routing_context_app_message(id, target_string, message) {
    const ptr0 = passStringToWasm0(target_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_app_message(id, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} schema
* @param {number} kind
* @returns {Promise<any>}
*/
export function routing_context_create_dht_record(id, schema, kind) {
    const ptr0 = passStringToWasm0(schema, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_create_dht_record(id, ptr0, len0, kind);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @param {string | undefined} [writer]
* @returns {Promise<any>}
*/
export function routing_context_open_dht_record(id, key, writer) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    var ptr1 = isLikeNone(writer) ? 0 : passStringToWasm0(writer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_open_dht_record(id, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @returns {Promise<any>}
*/
export function routing_context_close_dht_record(id, key) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_close_dht_record(id, ptr0, len0);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @returns {Promise<any>}
*/
export function routing_context_delete_dht_record(id, key) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_delete_dht_record(id, ptr0, len0);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @param {number} subkey
* @param {boolean} force_refresh
* @returns {Promise<any>}
*/
export function routing_context_get_dht_value(id, key, subkey, force_refresh) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_get_dht_value(id, ptr0, len0, subkey, force_refresh);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @param {number} subkey
* @param {string} data
* @param {string | undefined} [writer]
* @returns {Promise<any>}
*/
export function routing_context_set_dht_value(id, key, subkey, data, writer) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    var ptr2 = isLikeNone(writer) ? 0 : passStringToWasm0(writer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len2 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_set_dht_value(id, ptr0, len0, subkey, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @param {string} subkeys
* @param {string} expiration
* @param {number} count
* @returns {Promise<any>}
*/
export function routing_context_watch_dht_values(id, key, subkeys, expiration, count) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(subkeys, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(expiration, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_watch_dht_values(id, ptr0, len0, ptr1, len1, ptr2, len2, count);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @param {string} subkeys
* @returns {Promise<any>}
*/
export function routing_context_cancel_dht_watch(id, key, subkeys) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(subkeys, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_cancel_dht_watch(id, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {string} key
* @param {string} subkeys
* @param {string} scope
* @returns {Promise<any>}
*/
export function routing_context_inspect_dht_record(id, key, subkeys, scope) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(subkeys, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(scope, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.routing_context_inspect_dht_record(id, ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function new_private_route() {
    const ret = wasm.new_private_route();
    return takeObject(ret);
}

/**
* @param {string} stability
* @param {string} sequencing
* @returns {Promise<any>}
*/
export function new_custom_private_route(stability, sequencing) {
    const ptr0 = passStringToWasm0(stability, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(sequencing, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.new_custom_private_route(ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {string} blob
* @returns {Promise<any>}
*/
export function import_remote_private_route(blob) {
    const ptr0 = passStringToWasm0(blob, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.import_remote_private_route(ptr0, len0);
    return takeObject(ret);
}

/**
* @param {string} route_id
* @returns {Promise<any>}
*/
export function release_private_route(route_id) {
    const ptr0 = passStringToWasm0(route_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.release_private_route(ptr0, len0);
    return takeObject(ret);
}

/**
* @param {string} call_id
* @param {string} message
* @returns {Promise<any>}
*/
export function app_call_reply(call_id, message) {
    const ptr0 = passStringToWasm0(call_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.app_call_reply(ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {string} name
* @param {number} column_count
* @returns {Promise<any>}
*/
export function open_table_db(name, column_count) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.open_table_db(ptr0, len0, column_count);
    return takeObject(ret);
}

/**
* @param {number} id
* @returns {number}
*/
export function release_table_db(id) {
    const ret = wasm.release_table_db(id);
    return ret;
}

/**
* @param {string} name
* @returns {Promise<any>}
*/
export function delete_table_db(name) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.delete_table_db(ptr0, len0);
    return takeObject(ret);
}

/**
* @param {number} id
* @returns {number}
*/
export function table_db_get_column_count(id) {
    const ret = wasm.table_db_get_column_count(id);
    return ret >>> 0;
}

/**
* @param {number} id
* @param {number} col
* @returns {Promise<any>}
*/
export function table_db_get_keys(id, col) {
    const ret = wasm.table_db_get_keys(id, col);
    return takeObject(ret);
}

/**
* @param {number} id
* @returns {number}
*/
export function table_db_transact(id) {
    const ret = wasm.table_db_transact(id);
    return ret >>> 0;
}

/**
* @param {number} id
* @returns {number}
*/
export function release_table_db_transaction(id) {
    const ret = wasm.release_table_db_transaction(id);
    return ret;
}

/**
* @param {number} id
* @returns {Promise<any>}
*/
export function table_db_transaction_commit(id) {
    const ret = wasm.table_db_transaction_commit(id);
    return takeObject(ret);
}

/**
* @param {number} id
* @returns {Promise<any>}
*/
export function table_db_transaction_rollback(id) {
    const ret = wasm.table_db_transaction_rollback(id);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {number} col
* @param {string} key
* @param {string} value
* @returns {Promise<any>}
*/
export function table_db_transaction_store(id, col, key, value) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.table_db_transaction_store(id, col, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {number} col
* @param {string} key
* @returns {Promise<any>}
*/
export function table_db_transaction_delete(id, col, key) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.table_db_transaction_delete(id, col, ptr0, len0);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {number} col
* @param {string} key
* @param {string} value
* @returns {Promise<any>}
*/
export function table_db_store(id, col, key, value) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.table_db_store(id, col, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {number} col
* @param {string} key
* @returns {Promise<any>}
*/
export function table_db_load(id, col, key) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.table_db_load(id, col, ptr0, len0);
    return takeObject(ret);
}

/**
* @param {number} id
* @param {number} col
* @param {string} key
* @returns {Promise<any>}
*/
export function table_db_delete(id, col, key) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.table_db_delete(id, col, ptr0, len0);
    return takeObject(ret);
}

/**
* @returns {string}
*/
export function valid_crypto_kinds() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.valid_crypto_kinds(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
* @returns {number}
*/
export function best_crypto_kind() {
    const ret = wasm.best_crypto_kind();
    return ret >>> 0;
}

/**
* @param {string} node_ids
* @param {string} data
* @param {string} signatures
* @returns {Promise<any>}
*/
export function verify_signatures(node_ids, data, signatures) {
    const ptr0 = passStringToWasm0(node_ids, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(signatures, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.verify_signatures(ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @param {string} data
* @param {string} key_pairs
* @returns {Promise<any>}
*/
export function generate_signatures(data, key_pairs) {
    const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(key_pairs, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.generate_signatures(ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @returns {Promise<any>}
*/
export function generate_key_pair(kind) {
    const ret = wasm.generate_key_pair(kind);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key
* @param {string} secret
* @returns {Promise<any>}
*/
export function crypto_cached_dh(kind, key, secret) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_cached_dh(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key
* @param {string} secret
* @returns {Promise<any>}
*/
export function crypto_compute_dh(kind, key, secret) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_compute_dh(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key
* @param {string} secret
* @param {string} domain
* @returns {Promise<any>}
*/
export function crypto_generate_shared_secret(kind, key, secret, domain) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(domain, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_generate_shared_secret(kind, ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {number} len
* @returns {Promise<any>}
*/
export function crypto_random_bytes(kind, len) {
    const ret = wasm.crypto_random_bytes(kind, len);
    return takeObject(ret);
}

/**
* @param {number} kind
* @returns {Promise<any>}
*/
export function crypto_default_salt_length(kind) {
    const ret = wasm.crypto_default_salt_length(kind);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} password
* @param {string} salt
* @returns {Promise<any>}
*/
export function crypto_hash_password(kind, password, salt) {
    const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(salt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_hash_password(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} password
* @param {string} password_hash
* @returns {Promise<any>}
*/
export function crypto_verify_password(kind, password, password_hash) {
    const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(password_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_verify_password(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} password
* @param {string} salt
* @returns {Promise<any>}
*/
export function crypto_derive_shared_secret(kind, password, salt) {
    const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(salt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_derive_shared_secret(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @returns {Promise<any>}
*/
export function crypto_random_nonce(kind) {
    const ret = wasm.crypto_random_nonce(kind);
    return takeObject(ret);
}

/**
* @param {number} kind
* @returns {Promise<any>}
*/
export function crypto_random_shared_secret(kind) {
    const ret = wasm.crypto_random_shared_secret(kind);
    return takeObject(ret);
}

/**
* @param {number} kind
* @returns {Promise<any>}
*/
export function crypto_generate_key_pair(kind) {
    const ret = wasm.crypto_generate_key_pair(kind);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} data
* @returns {Promise<any>}
*/
export function crypto_generate_hash(kind, data) {
    const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_generate_hash(kind, ptr0, len0);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key
* @param {string} secret
* @returns {Promise<any>}
*/
export function crypto_validate_key_pair(kind, key, secret) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_validate_key_pair(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} data
* @param {string} hash
* @returns {Promise<any>}
*/
export function crypto_validate_hash(kind, data, hash) {
    const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_validate_hash(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key1
* @param {string} key2
* @returns {Promise<any>}
*/
export function crypto_distance(kind, key1, key2) {
    const ptr0 = passStringToWasm0(key1, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(key2, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_distance(kind, ptr0, len0, ptr1, len1);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key
* @param {string} secret
* @param {string} data
* @returns {Promise<any>}
*/
export function crypto_sign(kind, key, secret, data) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_sign(kind, ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} key
* @param {string} data
* @param {string} signature
* @returns {Promise<any>}
*/
export function crypto_verify(kind, key, data, signature) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(signature, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_verify(kind, ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @param {number} kind
* @returns {Promise<any>}
*/
export function crypto_aead_overhead(kind) {
    const ret = wasm.crypto_aead_overhead(kind);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} body
* @param {string} nonce
* @param {string} shared_secret
* @param {string | undefined} [associated_data]
* @returns {Promise<any>}
*/
export function crypto_decrypt_aead(kind, body, nonce, shared_secret, associated_data) {
    const ptr0 = passStringToWasm0(body, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(nonce, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    var ptr3 = isLikeNone(associated_data) ? 0 : passStringToWasm0(associated_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len3 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_decrypt_aead(kind, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} body
* @param {string} nonce
* @param {string} shared_secret
* @param {string | undefined} [associated_data]
* @returns {Promise<any>}
*/
export function crypto_encrypt_aead(kind, body, nonce, shared_secret, associated_data) {
    const ptr0 = passStringToWasm0(body, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(nonce, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    var ptr3 = isLikeNone(associated_data) ? 0 : passStringToWasm0(associated_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len3 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_encrypt_aead(kind, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    return takeObject(ret);
}

/**
* @param {number} kind
* @param {string} body
* @param {string} nonce
* @param {string} shared_secret
* @returns {Promise<any>}
*/
export function crypto_crypt_no_auth(kind, body, nonce, shared_secret) {
    const ptr0 = passStringToWasm0(body, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(nonce, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.crypto_crypt_no_auth(kind, ptr0, len0, ptr1, len1, ptr2, len2);
    return takeObject(ret);
}

/**
* @returns {string}
*/
export function now() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.now(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
* @param {string} command
* @returns {Promise<any>}
*/
export function debug(command) {
    const ptr0 = passStringToWasm0(command, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.debug(ptr0, len0);
    return takeObject(ret);
}

/**
* @returns {string}
*/
export function veilid_version_string() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.veilid_version_string(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
* @returns {any}
*/
export function veilid_version() {
    const ret = wasm.veilid_version();
    return takeObject(ret);
}

/**
* @returns {string}
*/
export function default_veilid_config() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.default_veilid_config(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    const mem = getUint32Memory0();
    for (let i = 0; i < array.length; i++) {
        mem[ptr / 4 + i] = addHeapObject(array[i]);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
function __wbg_adapter_451(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h01ac960159519cee(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

const VeilidRoutingContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_veilidroutingcontext_free(ptr >>> 0));
/**
*/
export class VeilidRoutingContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(VeilidRoutingContext.prototype);
        obj.__wbg_ptr = ptr;
        VeilidRoutingContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VeilidRoutingContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_veilidroutingcontext_free(ptr);
    }
    /**
    * Create a new VeilidRoutingContext, without any privacy or sequencing settings.
    */
    constructor() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidroutingcontext_create(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            this.__wbg_ptr = r0 >>> 0;
            return this;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Same as `new VeilidRoutingContext()` except easier to chain.
    * @returns {VeilidRoutingContext}
    */
    static create() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidroutingcontext_create(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return VeilidRoutingContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Allocate a new private route set with default cryptography and network options.
    * Returns a route id and a publishable 'blob' with the route encrypted with each crypto kind.
    * Those nodes importing the blob will have their choice of which crypto kind to use.
    *
    * Returns a route id and 'blob' that can be published over some means (DHT or otherwise) to be imported by another Veilid node.
    * @returns {Promise<VeilidRouteBlob>}
    */
    static newPrivateRoute() {
        const ret = wasm.veilidroutingcontext_newPrivateRoute();
        return takeObject(ret);
    }
    /**
    * Import a private route blob as a remote private route.
    *
    * Returns a route id that can be used to send private messages to the node creating this route.
    * @param {string} blob
    * @returns {CryptoKey}
    */
    importRemotePrivateRoute(blob) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(blob, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidroutingcontext_importRemotePrivateRoute(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Allocate a new private route and specify a specific cryptosystem, stability and sequencing preference.
    * Returns a route id and a publishable 'blob' with the route encrypted with each crypto kind.
    * Those nodes importing the blob will have their choice of which crypto kind to use.
    *
    * Returns a route id and 'blob' that can be published over some means (DHT or otherwise) to be imported by another Veilid node.
    * @param {Stability} stability
    * @param {Sequencing} sequencing
    * @returns {Promise<VeilidRouteBlob>}
    */
    static newCustomPrivateRoute(stability, sequencing) {
        const ret = wasm.veilidroutingcontext_newCustomPrivateRoute(addHeapObject(stability), addHeapObject(sequencing));
        return takeObject(ret);
    }
    /**
    * Release either a locally allocated or remotely imported private route.
    *
    * This will deactivate the route and free its resources and it can no longer be sent to or received from.
    * @param {string} route_id
    */
    static releasePrivateRoute(route_id) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(route_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidroutingcontext_releasePrivateRoute(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Respond to an AppCall received over a VeilidUpdate::AppCall.
    *
    * * `call_id` - specifies which call to reply to, and it comes from a VeilidUpdate::AppCall, specifically the VeilidAppCall::id() value.
    * * `message` - is an answer blob to be returned by the remote node's RoutingContext::app_call() function, and may be up to 32768 bytes
    * @param {string} call_id
    * @param {Uint8Array} message
    * @returns {Promise<void>}
    */
    static appCallReply(call_id, message) {
        const ptr0 = passStringToWasm0(call_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_appCallReply(ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * Turn on sender privacy, enabling the use of safety routes. This is the default and
    * calling this function is only necessary if you have previously disable safety or used other parameters.
    * Returns a new instance of VeilidRoutingContext - does not mutate.
    *
    * Default values for hop count, stability and sequencing preferences are used.
    *
    * * Hop count default is dependent on config, but is set to 1 extra hop.
    * * Stability default is to choose 'low latency' routes, preferring them over long-term reliability.
    * * Sequencing default is to have no preference for ordered vs unordered message delivery
    *
    * To customize the safety selection in use, use [VeilidRoutingContext::withSafety].
    * @returns {VeilidRoutingContext}
    */
    withDefaultSafety() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidroutingcontext_withDefaultSafety(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return VeilidRoutingContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Use a custom [SafetySelection]. Can be used to disable safety via [SafetySelection::Unsafe]
    * Returns a new instance of VeilidRoutingContext - does not mutate.
    * @param {SafetySelection} safety_selection
    * @returns {VeilidRoutingContext}
    */
    withSafety(safety_selection) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidroutingcontext_withSafety(retptr, this.__wbg_ptr, addHeapObject(safety_selection));
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return VeilidRoutingContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Use a specified `Sequencing` preference.
    * Returns a new instance of VeilidRoutingContext - does not mutate.
    * @param {Sequencing} sequencing
    * @returns {VeilidRoutingContext}
    */
    withSequencing(sequencing) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidroutingcontext_withSequencing(retptr, this.__wbg_ptr, addHeapObject(sequencing));
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return VeilidRoutingContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Get the safety selection in use on this routing context
    * @returns the SafetySelection currently in use if successful.
    * @returns {SafetySelection}
    */
    safety() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidroutingcontext_safety(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * App-level unidirectional message that does not expect any value to be returned.
    *
    * Veilid apps may use this for arbitrary message passing.
    *
    * @param {string} target - can be either a direct node id or a private route.
    * @param {string} message - an arbitrary message blob of up to `32768` bytes.
    */
    appMessage(target_string, message) {
        const ptr0 = passStringToWasm0(target_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_appMessage(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * App-level bidirectional call that expects a response to be returned.
    *
    * Veilid apps may use this for arbitrary message passing.
    *
    * @param {string} target_string - can be either a direct node id or a private route.
    * @param {Uint8Array} message - an arbitrary message blob of up to `32768` bytes.
    * @returns {Uint8Array} an answer blob of up to `32768` bytes.
    */
    appCall(target_string, request) {
        const ptr0 = passStringToWasm0(target_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(request, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_appCall(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * DHT Records Creates a new DHT record a specified crypto kind and schema
    *
    * The record is considered 'open' after the create operation succeeds.
    *
    * @returns the newly allocated DHT record's key if successful.
    * @param {DHTSchema} schema
    * @param {string} kind
    * @returns {Promise<DHTRecordDescriptor>}
    */
    createDhtRecord(schema, kind) {
        const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_createDhtRecord(this.__wbg_ptr, addHeapObject(schema), ptr0, len0);
        return takeObject(ret);
    }
    /**
    * Opens a DHT record at a specific key.
    *
    * Associates a secret if one is provided to provide writer capability. Records may only be opened or created. To re-open with a different routing context, first close the value.
    *
    * @returns the DHT record descriptor for the opened record if successful.
    * @param {string} writer - Stringified key pair, in the form of `key:secret` where `key` and `secret` are base64Url encoded.
    * @param {string} key - key of the DHT record.
    */
    openDhtRecord(key, writer) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(writer) ? 0 : passStringToWasm0(writer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_openDhtRecord(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * Closes a DHT record at a specific key that was opened with create_dht_record or open_dht_record.
    *
    * Closing a record allows you to re-open it with a different routing context
    * @param {string} key
    * @returns {Promise<void>}
    */
    closeDhtRecord(key) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_closeDhtRecord(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
    * Deletes a DHT record at a specific key
    *
    * If the record is opened, it must be closed before it is deleted.
    * Deleting a record does not delete it from the network, but will remove the storage of the record locally,
    * and will prevent its value from being refreshed on the network by this node.
    * @param {string} key
    * @returns {Promise<void>}
    */
    deleteDhtRecord(key) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_deleteDhtRecord(this.__wbg_ptr, ptr0, len0);
        return takeObject(ret);
    }
    /**
    * Gets the latest value of a subkey.
    *
    * May pull the latest value from the network, but by settings 'force_refresh' you can force a network data refresh.
    *
    * Returns `undefined` if the value subkey has not yet been set.
    * Returns a Uint8Array of `data` if the value subkey has valid data.
    * @param {string} key
    * @param {number} subkey
    * @param {boolean} forceRefresh
    * @returns {Promise<ValueData | undefined>}
    */
    getDhtValue(key, subkey, forceRefresh) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_getDhtValue(this.__wbg_ptr, ptr0, len0, subkey, forceRefresh);
        return takeObject(ret);
    }
    /**
    * Pushes a changed subkey value to the network
    *
    * Returns `undefined` if the value was successfully put.
    * Returns a Uint8Array of `data` if the value put was older than the one available on the network.
    * @param {string} key
    * @param {number} subkey
    * @param {Uint8Array} data
    * @param {string | undefined} [writer]
    * @returns {Promise<ValueData | undefined>}
    */
    setDhtValue(key, subkey, data, writer) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(writer) ? 0 : passStringToWasm0(writer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_setDhtValue(this.__wbg_ptr, ptr0, len0, subkey, ptr1, len1, ptr2, len2);
        return takeObject(ret);
    }
    /**
    * Add or update a watch to a DHT value that informs the user via an VeilidUpdate::ValueChange callback when the record has subkeys change.
    * One remote node will be selected to perform the watch and it will offer an expiration time based on a suggestion, and make an attempt to
    * continue to report changes via the callback. Nodes that agree to doing watches will be put on our 'ping' list to ensure they are still around
    * otherwise the watch will be cancelled and will have to be re-watched.
    *
    * There is only one watch permitted per record. If a change to a watch is desired, the previous one will be overwritten.
    * * `key` is the record key to watch. it must first be opened for reading or writing.
    * * `subkeys` is the the range of subkeys to watch. The range must not exceed 512 discrete non-overlapping or adjacent subranges. If no range is specified, this is equivalent to watching the entire range of subkeys.
    * * `expiration` is the desired timestamp of when to automatically terminate the watch, in microseconds. If this value is less than `network.rpc.timeout_ms` milliseconds in the future, this function will return an error immediately.
    * * `count` is the number of times the watch will be sent, maximum. A zero value here is equivalent to a cancellation.
    *
    * Returns a timestamp of when the watch will expire. All watches are guaranteed to expire at some point in the future,
    * and the returned timestamp will be no later than the requested expiration, but -may- be before the requested expiration.
    * If the returned timestamp is zero it indicates that the watch creation or update has failed. In the case of a faild update, the watch is considered cancelled.
    *
    * DHT watches are accepted with the following conditions:
    * * First-come first-served basis for arbitrary unauthenticated readers, up to network.dht.public_watch_limit per record
    * * If a member (either the owner or a SMPL schema member) has opened the key for writing (even if no writing is performed) then the watch will be signed and guaranteed network.dht.member_watch_limit per writer
    *
    * Members can be specified via the SMPL schema and do not need to allocate writable subkeys in order to offer a member watch capability.
    * @param {string} key
    * @param {ValueSubkeyRangeSet | undefined} [subkeys]
    * @param {string | undefined} [expiration]
    * @param {number | undefined} [count]
    * @returns {Promise<string>}
    */
    watchDhtValues(key, subkeys, expiration, count) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(expiration) ? 0 : passStringToWasm0(expiration, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_watchDhtValues(this.__wbg_ptr, ptr0, len0, isLikeNone(subkeys) ? 0 : addHeapObject(subkeys), ptr1, len1, !isLikeNone(count), isLikeNone(count) ? 0 : count);
        return takeObject(ret);
    }
    /**
    * Cancels a watch early
    *
    * This is a convenience function that cancels watching all subkeys in a range. The subkeys specified here
    * are subtracted from the watched subkey range. If no range is specified, this is equivalent to cancelling the entire range of subkeys.
    * Only the subkey range is changed, the expiration and count remain the same.
    * If no subkeys remain, the watch is entirely cancelled and will receive no more updates.
    * Returns true if there is any remaining watch for this record
    * Returns false if the entire watch has been cancelled
    * @param {string} key
    * @param {ValueSubkeyRangeSet | undefined} [subkeys]
    * @returns {Promise<boolean>}
    */
    cancelDhtWatch(key, subkeys) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_cancelDhtWatch(this.__wbg_ptr, ptr0, len0, isLikeNone(subkeys) ? 0 : addHeapObject(subkeys));
        return takeObject(ret);
    }
    /**
    * Inspects a DHT record for subkey state.
    * This is useful for checking if you should push new subkeys to the network, or retrieve the current state of a record from the network
    * to see what needs updating locally.
    *
    * * `key` is the record key to watch. it must first be opened for reading or writing.
    * * `subkeys` is the the range of subkeys to inspect. The range must not exceed 512 discrete non-overlapping or adjacent subranges.
    *    If no range is specified, this is equivalent to inspecting the entire range of subkeys. In total, the list of subkeys returned will be truncated at 512 elements.
    * * `scope` is what kind of range the inspection has:
    *
    *   - DHTReportScope::Local
    *     Results will be only for a locally stored record.
    *     Useful for seeing what subkeys you have locally and which ones have not been retrieved
    *
    *   - DHTReportScope::SyncGet
    *     Return the local sequence numbers and the network sequence numbers with GetValue fanout parameters
    *     Provides an independent view of both the local sequence numbers and the network sequence numbers for nodes that
    *     would be reached as if the local copy did not exist locally.
    *     Useful for determining if the current local copy should be updated from the network.
    *
    *   - DHTReportScope::SyncSet
    *     Return the local sequence numbers and the network sequence numbers with SetValue fanout parameters
    *     Provides an independent view of both the local sequence numbers and the network sequence numbers for nodes that
    *     would be reached as if the local copy did not exist locally.
    *     Useful for determining if the unchanged local copy should be pushed to the network.
    *
    *   - DHTReportScope::UpdateGet
    *     Return the local sequence numbers and the network sequence numbers with GetValue fanout parameters
    *     Provides an view of both the local sequence numbers and the network sequence numbers for nodes that
    *     would be reached as if a GetValue operation were being performed, including accepting newer values from the network.
    *     Useful for determining which subkeys would change with a GetValue operation
    *
    *   - DHTReportScope::UpdateSet
    *     Return the local sequence numbers and the network sequence numbers with SetValue fanout parameters
    *     Provides an view of both the local sequence numbers and the network sequence numbers for nodes that
    *     would be reached as if a SetValue operation were being performed, including accepting newer values from the network.
    *     This simulates a SetValue with the initial sequence number incremented by 1, like a real SetValue would when updating.
    *     Useful for determine which subkeys would change with an SetValue operation
    *
    * Returns a DHTRecordReport with the subkey ranges that were returned that overlapped the schema, and sequence numbers for each of the subkeys in the range.
    * @param {string} key
    * @param {ValueSubkeyRangeSet | undefined} [subkeys]
    * @param {DHTReportScope | undefined} [scope]
    * @returns {Promise<DHTRecordReport>}
    */
    inspectDhtRecord(key, subkeys, scope) {
        const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidroutingcontext_inspectDhtRecord(this.__wbg_ptr, ptr0, len0, isLikeNone(subkeys) ? 0 : addHeapObject(subkeys), isLikeNone(scope) ? 0 : addHeapObject(scope));
        return takeObject(ret);
    }
}

const VeilidTableDBFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_veilidtabledb_free(ptr >>> 0));
/**
*/
export class VeilidTableDB {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VeilidTableDBFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_veilidtabledb_free(ptr);
    }
    /**
    * If the column count is greater than an existing TableDB's column count,
    * the database will be upgraded to add the missing columns.
    * @param {string} tableName
    * @param {number} columnCount
    */
    constructor(tableName, columnCount) {
        const ptr0 = passStringToWasm0(tableName, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidtabledb_new(ptr0, len0, columnCount);
        this.__wbg_ptr = ret >>> 0;
        return this;
    }
    /**
    * Get or create the TableDB database table.
    * This is called automatically when performing actions on the TableDB.
    * @returns {Promise<void>}
    */
    openTable() {
        const ret = wasm.veilidtabledb_openTable(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
    * Delete this TableDB.
    * @returns {Promise<boolean>}
    */
    deleteTable() {
        const ret = wasm.veilidtabledb_deleteTable(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
    * Read a key from a column in the TableDB immediately.
    * @param {number} columnId
    * @param {Uint8Array} key
    * @returns {Promise<Uint8Array | undefined>}
    */
    load(columnId, key) {
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidtabledb_load(this.__wbg_ptr, columnId, ptr0, len0);
        return takeObject(ret);
    }
    /**
    * Store a key with a value in a column in the TableDB.
    * Performs a single transaction immediately.
    * @param {number} columnId
    * @param {Uint8Array} key
    * @param {Uint8Array} value
    * @returns {Promise<void>}
    */
    store(columnId, key, value) {
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(value, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.veilidtabledb_store(this.__wbg_ptr, columnId, ptr0, len0, ptr1, len1);
        return takeObject(ret);
    }
    /**
    * Delete key with from a column in the TableDB.
    * @param {number} columnId
    * @param {Uint8Array} key
    * @returns {Promise<Uint8Array | undefined>}
    */
    delete(columnId, key) {
        const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidtabledb_delete(this.__wbg_ptr, columnId, ptr0, len0);
        return takeObject(ret);
    }
    /**
    * Get the list of keys in a column of the TableDB.
    *
    * Returns an array of Uint8Array keys.
    * @param {number} columnId
    * @returns {Promise<Uint8Array[]>}
    */
    getKeys(columnId) {
        const ret = wasm.veilidtabledb_getKeys(this.__wbg_ptr, columnId);
        return takeObject(ret);
    }
    /**
    * Start a TableDB write transaction.
    * The transaction object must be committed or rolled back before dropping.
    * @returns {Promise<VeilidTableDBTransaction>}
    */
    createTransaction() {
        const ret = wasm.veilidtabledb_createTransaction(this.__wbg_ptr);
        return takeObject(ret);
    }
}

const VeilidTableDBTransactionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_veilidtabledbtransaction_free(ptr >>> 0));
/**
*/
export class VeilidTableDBTransaction {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(VeilidTableDBTransaction.prototype);
        obj.__wbg_ptr = ptr;
        VeilidTableDBTransactionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VeilidTableDBTransactionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_veilidtabledbtransaction_free(ptr);
    }
    /**
    * Don't use this constructor directly.
    * Use `.createTransaction()` on an instance of `VeilidTableDB` instead.
    * @deprecated
    */
    constructor() {
        const ret = wasm.veilidtabledbtransaction_new();
        this.__wbg_ptr = ret >>> 0;
        return this;
    }
    /**
    * Commit the transaction. Performs all actions atomically.
    * @returns {Promise<void>}
    */
    commit() {
        const ret = wasm.veilidtabledbtransaction_commit(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
    * Rollback the transaction. Does nothing to the TableDB.
    */
    rollback() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidtabledbtransaction_rollback(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Store a key with a value in a column in the TableDB.
    * Does not modify TableDB until `.commit()` is called.
    * @param {number} col
    * @param {Uint8Array} key
    * @param {Uint8Array} value
    */
    store(col, key, value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(value, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.veilidtabledbtransaction_store(retptr, this.__wbg_ptr, col, ptr0, len0, ptr1, len1);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Delete key with from a column in the TableDB
    * @param {number} col
    * @param {Uint8Array} key
    */
    deleteKey(col, key) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidtabledbtransaction_deleteKey(retptr, this.__wbg_ptr, col, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}

const veilidClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_veilidclient_free(ptr >>> 0));
/**
*/
export class veilidClient {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        veilidClientFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_veilidclient_free(ptr);
    }
    /**
    * @param {VeilidWASMConfig} platformConfig
    * @returns {Promise<void>}
    */
    static initializeCore(platformConfig) {
        const ret = wasm.veilidclient_initializeCore(addHeapObject(platformConfig));
        return takeObject(ret);
    }
    /**
    * Initialize a Veilid node, with the configuration in JSON format
    *
    * Must be called only once at the start of an application
    *
    * @param {UpdateVeilidFunction} update_callback_js - called when internal state of the Veilid node changes, for example, when app-level messages are received, when private routes die and need to be reallocated, or when routing table states change
    * @param {string} json_config - called at startup to supply a JSON configuration object.
    * @param {UpdateVeilidFunction} update_callback_js
    * @param {string} json_config
    * @returns {Promise<void>}
    */
    static startupCore(update_callback_js, json_config) {
        const ptr0 = passStringToWasm0(json_config, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidclient_startupCore(addHeapObject(update_callback_js), ptr0, len0);
        return takeObject(ret);
    }
    /**
    * @param {string} layer
    * @param {VeilidConfigLogLevel} log_level
    */
    static changeLogLevel(layer, log_level) {
        const ptr0 = passStringToWasm0(layer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.veilidclient_changeLogLevel(ptr0, len0, addHeapObject(log_level));
    }
    /**
    * @param {string} layer
    * @param {(string)[]} changes
    */
    static changeLogIgnore(layer, changes) {
        const ptr0 = passStringToWasm0(layer, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(changes, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.veilidclient_changeLogIgnore(ptr0, len0, ptr1, len1);
    }
    /**
    * Shut down Veilid and terminate the API.
    * @returns {Promise<void>}
    */
    static shutdownCore() {
        const ret = wasm.veilidclient_shutdownCore();
        return takeObject(ret);
    }
    /**
    * Get a full copy of the current state of Veilid.
    * @returns {Promise<VeilidState>}
    */
    static getState() {
        const ret = wasm.veilidclient_getState();
        return takeObject(ret);
    }
    /**
    * Connect to the network.
    * @returns {Promise<void>}
    */
    static attach() {
        const ret = wasm.veilidclient_attach();
        return takeObject(ret);
    }
    /**
    * Disconnect from the network.
    * @returns {Promise<void>}
    */
    static detach() {
        const ret = wasm.veilidclient_detach();
        return takeObject(ret);
    }
    /**
    * Get the current timestamp, in string format
    * @returns {string}
    */
    static now() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidclient_now(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
    * Execute an 'internal debug command'.
    * @param {string} command
    * @returns {Promise<string>}
    */
    static debug(command) {
        const ptr0 = passStringToWasm0(command, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.veilidclient_debug(ptr0, len0);
        return takeObject(ret);
    }
    /**
    * Return the cargo package version of veilid-core, in object format.
    * @returns {VeilidVersion}
    */
    static version() {
        const ret = wasm.veilidclient_version();
        return takeObject(ret);
    }
    /**
    * Return the cargo package version of veilid-core, in string format.
    * @returns {string}
    */
    static versionString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidclient_versionString(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
    * Return the default veilid configuration, in string format
    * @returns {string}
    */
    static defaultConfig() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidclient_defaultConfig(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const veilidCryptoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_veilidcrypto_free(ptr >>> 0));
/**
*/
export class veilidCrypto {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        veilidCryptoFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_veilidcrypto_free(ptr);
    }
    /**
    * @returns {string[]}
    */
    static validCryptoKinds() {
        const ret = wasm.veilidcrypto_validCryptoKinds();
        return takeObject(ret);
    }
    /**
    * @returns {string}
    */
    static bestCryptoKind() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.veilidcrypto_bestCryptoKind(retptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key
    * @param {string} secret
    * @returns {string}
    */
    static cachedDh(kind, key, secret) {
        let deferred5_0;
        let deferred5_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_cachedDh(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr4 = r0;
            var len4 = r1;
            if (r3) {
                ptr4 = 0; len4 = 0;
                throw takeObject(r2);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key
    * @param {string} secret
    * @returns {string}
    */
    static computeDh(kind, key, secret) {
        let deferred5_0;
        let deferred5_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_computeDh(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr4 = r0;
            var len4 = r1;
            if (r3) {
                ptr4 = 0; len4 = 0;
                throw takeObject(r2);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key
    * @param {string} secret
    * @param {Uint8Array} domain
    * @returns {string}
    */
    static generateSharedSecret(kind, key, secret, domain) {
        let deferred6_0;
        let deferred6_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passArray8ToWasm0(domain, wasm.__wbindgen_malloc);
            const len3 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_generateSharedSecret(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr5 = r0;
            var len5 = r1;
            if (r3) {
                ptr5 = 0; len5 = 0;
                throw takeObject(r2);
            }
            deferred6_0 = ptr5;
            deferred6_1 = len5;
            return getStringFromWasm0(ptr5, len5);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {number} len
    * @returns {Uint8Array}
    */
    static randomBytes(kind, len) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_randomBytes(retptr, ptr0, len0, len);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @returns {number}
    */
    static defaultSaltLength(kind) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_defaultSaltLength(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return r0 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} password
    * @param {Uint8Array} salt
    * @returns {string}
    */
    static hashPassword(kind, password, salt) {
        let deferred5_0;
        let deferred5_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_hashPassword(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr4 = r0;
            var len4 = r1;
            if (r3) {
                ptr4 = 0; len4 = 0;
                throw takeObject(r2);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} password
    * @param {string} password_hash
    * @returns {boolean}
    */
    static verifyPassword(kind, password, password_hash) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(password_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_verifyPassword(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} password
    * @param {Uint8Array} salt
    * @returns {string}
    */
    static deriveSharedSecret(kind, password, salt) {
        let deferred5_0;
        let deferred5_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_deriveSharedSecret(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr4 = r0;
            var len4 = r1;
            if (r3) {
                ptr4 = 0; len4 = 0;
                throw takeObject(r2);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @returns {string}
    */
    static randomNonce(kind) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_randomNonce(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @returns {string}
    */
    static randomSharedSecret(kind) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_randomSharedSecret(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
    * @param {string[]} node_ids
    * @param {Uint8Array} data
    * @param {string[]} signatures
    * @returns {string[]}
    */
    static verifySignatures(node_ids, data, signatures) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_verifySignatures(retptr, addHeapObject(node_ids), ptr0, len0, addHeapObject(signatures));
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} data
    * @param {string[]} key_pairs
    * @returns {string[]}
    */
    static generateSignatures(data, key_pairs) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_generateSignatures(retptr, ptr0, len0, addHeapObject(key_pairs));
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @returns {string}
    */
    static generateKeyPair(kind) {
        let deferred3_0;
        let deferred3_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_generateKeyPair(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr2 = r0;
            var len2 = r1;
            if (r3) {
                ptr2 = 0; len2 = 0;
                throw takeObject(r2);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} data
    * @returns {string}
    */
    static generateHash(kind, data) {
        let deferred4_0;
        let deferred4_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_generateHash(retptr, ptr0, len0, ptr1, len1);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr3 = r0;
            var len3 = r1;
            if (r3) {
                ptr3 = 0; len3 = 0;
                throw takeObject(r2);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key
    * @param {string} secret
    * @returns {boolean}
    */
    static validateKeyPair(kind, key, secret) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_validateKeyPair(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} data
    * @param {string} hash
    * @returns {boolean}
    */
    static validateHash(kind, data, hash) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_validateHash(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return r0 !== 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key1
    * @param {string} key2
    * @returns {string}
    */
    static distance(kind, key1, key2) {
        let deferred5_0;
        let deferred5_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key1, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(key2, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_distance(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr4 = r0;
            var len4 = r1;
            if (r3) {
                ptr4 = 0; len4 = 0;
                throw takeObject(r2);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key
    * @param {string} secret
    * @param {Uint8Array} data
    * @returns {string}
    */
    static sign(kind, key, secret, data) {
        let deferred6_0;
        let deferred6_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len3 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_sign(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            var ptr5 = r0;
            var len5 = r1;
            if (r3) {
                ptr5 = 0; len5 = 0;
                throw takeObject(r2);
            }
            deferred6_0 = ptr5;
            deferred6_1 = len5;
            return getStringFromWasm0(ptr5, len5);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
        }
    }
    /**
    * @param {string} kind
    * @param {string} key
    * @param {Uint8Array} data
    * @param {string} signature
    */
    static verify(kind, key, data, signature) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passStringToWasm0(signature, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len3 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_verify(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @returns {number}
    */
    static aeadOverhead(kind) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_aeadOverhead(retptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return r0 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} body
    * @param {string} nonce
    * @param {string} shared_secret
    * @param {Uint8Array | undefined} [associated_data]
    * @returns {Uint8Array}
    */
    static decryptAead(kind, body, nonce, shared_secret, associated_data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(body, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(nonce, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len3 = WASM_VECTOR_LEN;
            var ptr4 = isLikeNone(associated_data) ? 0 : passArray8ToWasm0(associated_data, wasm.__wbindgen_malloc);
            var len4 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_decryptAead(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v6 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v6;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} body
    * @param {string} nonce
    * @param {string} shared_secret
    * @param {Uint8Array | undefined} [associated_data]
    * @returns {Uint8Array}
    */
    static encryptAead(kind, body, nonce, shared_secret, associated_data) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(body, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(nonce, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len3 = WASM_VECTOR_LEN;
            var ptr4 = isLikeNone(associated_data) ? 0 : passArray8ToWasm0(associated_data, wasm.__wbindgen_malloc);
            var len4 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_encryptAead(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v6 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v6;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {string} kind
    * @param {Uint8Array} body
    * @param {string} nonce
    * @param {string} shared_secret
    * @returns {Uint8Array}
    */
    static cryptNoAuth(kind, body, nonce, shared_secret) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(kind, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passArray8ToWasm0(body, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(nonce, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passStringToWasm0(shared_secret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len3 = WASM_VECTOR_LEN;
            wasm.veilidcrypto_cryptNoAuth(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            var r3 = getInt32Memory0()[retptr / 4 + 3];
            if (r3) {
                throw takeObject(r2);
            }
            var v5 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1, 1);
            return v5;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Length of a crypto key in bytes
    * @returns {number}
    */
    static get CRYPTO_KEY_LENGTH() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a crypto key in bytes after encoding to base64url
    * @returns {number}
    */
    static get CRYPTO_KEY_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH_ENCODED();
        return ret >>> 0;
    }
    /**
    * Length of a hash digest in bytes
    * @returns {number}
    */
    static get HASH_DIGEST_LENGTH() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a hash digest in bytes after encoding to base64url
    * @returns {number}
    */
    static get HASH_DIGEST_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH_ENCODED();
        return ret >>> 0;
    }
    /**
    * Length of a nonce in bytes
    * @returns {number}
    */
    static get NONCE_LENGTH() {
        const ret = wasm.veilidcrypto_NONCE_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a nonce in bytes after encoding to base64url
    * @returns {number}
    */
    static get NONCE_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a crypto key in bytes
    * @returns {number}
    */
    static get PUBLIC_KEY_LENGTH() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a crypto key in bytes after encoding to base64url
    * @returns {number}
    */
    static get PUBLIC_KEY_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH_ENCODED();
        return ret >>> 0;
    }
    /**
    * Length of a route id in bytes
    * @returns {number}
    */
    static get ROUTE_ID_LENGTH() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a route id in bytes after encoding to base64url
    * @returns {number}
    */
    static get ROUTE_ID_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH_ENCODED();
        return ret >>> 0;
    }
    /**
    * Length of a secret key in bytes
    * @returns {number}
    */
    static get SECRET_KEY_LENGTH() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a secret key in bytes after encoding to base64url
    * @returns {number}
    */
    static get SECRET_KEY_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH_ENCODED();
        return ret >>> 0;
    }
    /**
    * Length of a shared secret in bytes
    * @returns {number}
    */
    static get SHARED_SECRET_LENGTH() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a shared secret in bytes after encoding to base64url
    * @returns {number}
    */
    static get SHARED_SECRET_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_CRYPTO_KEY_LENGTH_ENCODED();
        return ret >>> 0;
    }
    /**
    * Length of a signature in bytes
    * @returns {number}
    */
    static get SIGNATURE_LENGTH() {
        const ret = wasm.veilidcrypto_SIGNATURE_LENGTH();
        return ret >>> 0;
    }
    /**
    * Length of a signature in bytes after encoding to base64url
    * @returns {number}
    */
    static get SIGNATURE_LENGTH_ENCODED() {
        const ret = wasm.veilidcrypto_SIGNATURE_LENGTH_ENCODED();
        return ret >>> 0;
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_is_bigint = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'bigint';
        return ret;
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_bigint_from_i64 = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg_veilidtabledbtransaction_new = function(arg0) {
        const ret = VeilidTableDBTransaction.__wrap(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_abda76e883ba8a5f = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_658279fe44541cf6 = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_error_f851667af71bcfc6 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        return ret;
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg_set_f975102236d3c502 = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_log_6f5772faaf29810f = function(arg0, arg1) {
        console.log(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_clearTimeout_76877dbc010e786d = function(arg0) {
        const ret = clearTimeout(takeObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_setTimeout_75cb9b6991a4031d = function() { return handleError(function (arg0, arg1) {
        const ret = setTimeout(getObject(arg0), arg1);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_null = function(arg0) {
        const ret = getObject(arg0) === null;
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(arg0) {
        queueMicrotask(getObject(arg0));
    };
    imports.wbg.__wbg_crypto_d05b68a3572bb8ca = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_process_b02b3570280d0366 = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_c1cb42213cedf0f5 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_43b1089f407e4ec2 = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_require_9a7e0f667ead4995 = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_msCrypto_10fc94afee92bd76 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_b70ccbdf4926a99d = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_7e42b4fb8779dc6d = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_String_88810dfeb4021902 = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_getwithrefkey_5e6d9547403deab8 = function(arg0, arg1) {
        const ret = getObject(arg0)[getObject(arg1)];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_841ac57cff3d672b = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_log_c9486ca5d8e2cbe8 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.log(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_log_aba5996d9bde071f = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.log(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg4, arg5), getStringFromWasm0(arg6, arg7));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_mark_40e050a77cc39fea = function(arg0, arg1) {
        performance.mark(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_measure_aa7a73f17813f708 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        let deferred0_0;
        let deferred0_1;
        let deferred1_0;
        let deferred1_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            deferred1_0 = arg2;
            deferred1_1 = arg3;
            performance.measure(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }, arguments) };
    imports.wbg.__wbg_instanceof_Window_f401953a2cf86220 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Window;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_localStorage_e381d34d0c40c761 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).localStorage;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_indexedDB_7c51d9056667f4e0 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_Blob_83ad3dd4c9c406f0 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Blob;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_code_bddcff79610894cf = function(arg0) {
        const ret = getObject(arg0).code;
        return ret;
    };
    imports.wbg.__wbg_length_9ae5daf9a690cba9 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_key_7a534de95a1f5fbf = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).key;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_continue_f1c3e0815924de62 = function() { return handleError(function (arg0) {
        getObject(arg0).continue();
    }, arguments) };
    imports.wbg.__wbg_bound_25385469508e98c7 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = IDBKeyRange.bound(getObject(arg0), getObject(arg1), arg2 !== 0, arg3 !== 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_lowerBound_cd1c8a3b3fdf1582 = function() { return handleError(function (arg0) {
        const ret = IDBKeyRange.lowerBound(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getItem_164e8e5265095b87 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg1).getItem(getStringFromWasm0(arg2, arg3));
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments) };
    imports.wbg.__wbg_setItem_ba2bb41d73dac079 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_delete_808f42904ec49124 = function() { return handleError(function (arg0, arg1, arg2) {
        delete getObject(arg0)[getStringFromWasm0(arg1, arg2)];
    }, arguments) };
    imports.wbg.__wbg_delete_f60bba7d0ae59a4f = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).delete(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_openCursor_30d58ae27a327629 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).openCursor();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_openCursor_611b1e488c393dd8 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).openCursor(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_put_22792e17580ca18b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).put(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_IdbRequest_93249da04f5370b6 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof IDBRequest;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_result_6cedf5f78600a79c = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).result;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setonsuccess_632ce0a1460455c2 = function(arg0, arg1) {
        getObject(arg0).onsuccess = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_8479b33e7568a904 = function(arg0, arg1) {
        getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_setoncomplete_d8e4236665cbf1e2 = function(arg0, arg1) {
        getObject(arg0).oncomplete = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_da071ec94e148397 = function(arg0, arg1) {
        getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_objectStore_da468793bd9df17b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).objectStore(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_wasClean_8222e9acf5c5ad07 = function(arg0) {
        const ret = getObject(arg0).wasClean;
        return ret;
    };
    imports.wbg.__wbg_code_5ee5dcc2842228cd = function(arg0) {
        const ret = getObject(arg0).code;
        return ret;
    };
    imports.wbg.__wbg_reason_5ed6709323849cb1 = function(arg0, arg1) {
        const ret = getObject(arg1).reason;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_type_c7f33162571befe7 = function(arg0, arg1) {
        const ret = getObject(arg1).type;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_target_2fc177e386c8b7b0 = function(arg0) {
        const ret = getObject(arg0).target;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_IdbCursorWithValue_abeb44d13d947bc2 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof IDBCursorWithValue;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_value_86d3334f5075b232 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_deleteDatabase_dfe478c1a1a0a29e = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).deleteDatabase(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_open_f0d7259fd7e689ce = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).open(getStringFromWasm0(arg1, arg2), arg3 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_open_a05198d687357536 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).open(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setonupgradeneeded_ad7645373c7d5e1b = function(arg0, arg1) {
        getObject(arg0).onupgradeneeded = getObject(arg1);
    };
    imports.wbg.__wbg_url_1ac02c9add50c527 = function(arg0, arg1) {
        const ret = getObject(arg1).url;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_readyState_1c157e4ea17c134a = function(arg0) {
        const ret = getObject(arg0).readyState;
        return ret;
    };
    imports.wbg.__wbg_setonopen_ce7a4c51e5cf5788 = function(arg0, arg1) {
        getObject(arg0).onopen = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_39a785302b0cd2e9 = function(arg0, arg1) {
        getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_setonclose_b9929b1c1624dff3 = function(arg0, arg1) {
        getObject(arg0).onclose = getObject(arg1);
    };
    imports.wbg.__wbg_setonmessage_2af154ce83a3dc94 = function(arg0, arg1) {
        getObject(arg0).onmessage = getObject(arg1);
    };
    imports.wbg.__wbg_setbinaryType_b0cf5103cd561959 = function(arg0, arg1) {
        getObject(arg0).binaryType = takeObject(arg1);
    };
    imports.wbg.__wbg_new_6c74223c77cfabad = function() { return handleError(function (arg0, arg1) {
        const ret = new WebSocket(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithstrsequence_9bc178264d955680 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = new WebSocket(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_close_acd9532ff5c093ea = function() { return handleError(function (arg0) {
        getObject(arg0).close();
    }, arguments) };
    imports.wbg.__wbg_send_70603dff16b81b66 = function() { return handleError(function (arg0, arg1, arg2) {
        getObject(arg0).send(getStringFromWasm0(arg1, arg2));
    }, arguments) };
    imports.wbg.__wbg_send_5fcd7bab9777194e = function() { return handleError(function (arg0, arg1, arg2) {
        getObject(arg0).send(getArrayU8FromWasm0(arg1, arg2));
    }, arguments) };
    imports.wbg.__wbg_data_3ce7c145ca4fbcdc = function(arg0) {
        const ret = getObject(arg0).data;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_IdbDatabase_db671cf2454a9542 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof IDBDatabase;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_version_7406e3f97ae69966 = function(arg0) {
        const ret = getObject(arg0).version;
        return ret;
    };
    imports.wbg.__wbg_objectStoreNames_588b5924274239fd = function(arg0) {
        const ret = getObject(arg0).objectStoreNames;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_close_6bfe4ca2fe67cb67 = function(arg0) {
        getObject(arg0).close();
    };
    imports.wbg.__wbg_createObjectStore_882f2f6b1b1ef040 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).createObjectStore(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_transaction_c32bb10c9c692f4b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).transaction(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_transaction_b39e2665b40b6324 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).transaction(getObject(arg1), takeObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_bd8e338fbd5f5cc8 = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_cd7af8117672b8b8 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_40fc327bfc8770e6 = function(arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_196c84450b364254 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_done_298b57d23c0fc80c = function(arg0) {
        const ret = getObject(arg0).done;
        return ret;
    };
    imports.wbg.__wbg_value_d93c65011f51a456 = function(arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_e3c254076557e348 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_27c0f87801dedf93 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_self_ce0dbfc45cf2f5be = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_c6fb939a7f436783 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_d1e6af4856ba331b = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_207b558942527489 = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_eval_020a6ea487e91ede = function() { return handleError(function (arg0, arg1) {
        const ret = eval(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_set_d4638f722068f043 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_from_89e3fc3ba5e6fb48 = function(arg0) {
        const ret = Array.from(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_isArray_2ab64d95e09ea0ae = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_push_a5b05aedc7234f9f = function(arg0, arg1) {
        const ret = getObject(arg0).push(getObject(arg1));
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_836825be07d4c9d2 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_call_b3ca7c6051f9bec1 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_isSafeInteger_f7b04ef02296c4d2 = function(arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_getUTCDate_152a4d8dd6de9d1d = function(arg0) {
        const ret = getObject(arg0).getUTCDate();
        return ret;
    };
    imports.wbg.__wbg_getUTCFullYear_066048e6873d46d3 = function(arg0) {
        const ret = getObject(arg0).getUTCFullYear();
        return ret;
    };
    imports.wbg.__wbg_getUTCHours_8ef4d8de5f603149 = function(arg0) {
        const ret = getObject(arg0).getUTCHours();
        return ret;
    };
    imports.wbg.__wbg_getUTCMilliseconds_8a14e6a1c0f2207f = function(arg0) {
        const ret = getObject(arg0).getUTCMilliseconds();
        return ret;
    };
    imports.wbg.__wbg_getUTCMinutes_451bebf58ea67001 = function(arg0) {
        const ret = getObject(arg0).getUTCMinutes();
        return ret;
    };
    imports.wbg.__wbg_getUTCMonth_3eb33a561a55e7b7 = function(arg0) {
        const ret = getObject(arg0).getUTCMonth();
        return ret;
    };
    imports.wbg.__wbg_getUTCSeconds_06f29efd7b038626 = function(arg0) {
        const ret = getObject(arg0).getUTCSeconds();
        return ret;
    };
    imports.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
        const ret = new Date();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_now_3014639a94423537 = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_setTime_75c97d460980b122 = function(arg0, arg1) {
        const ret = getObject(arg0).setTime(arg1);
        return ret;
    };
    imports.wbg.__wbg_entries_95cc2c823b285a09 = function(arg0) {
        const ret = Object.entries(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_81740750da40724f = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_451(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_resolve_b0083a7967828ec8 = function(arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_12d079cc21e14bdb = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_63b92bc8671ed464 = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_a47bac70306a19a7 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_length_c20a40f15020d68a = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_2b3bbecd033d19f6 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_has_0af94d20077affa2 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.has(getObject(arg0), getObject(arg1));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_parse_66d1801634e099ac = function() { return handleError(function (arg0, arg1) {
        const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof(v) === 'bigint' ? v : undefined;
        getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? BigInt(0) : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper7041 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 1314, __wbg_adapter_50);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper12183 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 2307, __wbg_adapter_53);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper12325 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 2349, __wbg_adapter_56);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper12326 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 2349, __wbg_adapter_59);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper12735 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 2434, __wbg_adapter_62);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper12816 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 2446, __wbg_adapter_65);
        return addHeapObject(ret);
    };

    return imports;
}

function __wbg_init_memory(imports, maybe_memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedBigInt64Memory0 = null;
    cachedFloat64Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;


    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(input) {
    if (wasm !== undefined) return wasm;

    if (typeof input === 'undefined') {
        input = new URL('veilid_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await input, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync }
export default __wbg_init;
