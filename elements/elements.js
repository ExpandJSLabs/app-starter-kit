(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
}
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
window.Polymer = Polymer;
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
;
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
var n$ = Object.getOwnPropertyNames(api);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, api, prototype);
}
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
var id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
this._mixinBehavior(behaviors[i]);
}
return behaviors;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
;
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0, p; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
dashToCamelCase: function (dash) {
var mapped = Polymer.CaseMap._caseMap[dash];
if (mapped) {
return mapped;
}
if (dash.indexOf('-') < 0) {
return Polymer.CaseMap._caseMap[dash] = dash;
}
return Polymer.CaseMap._caseMap[dash] = dash.replace(/-([a-z])/g, function (m) {
return m[1].toUpperCase();
});
},
camelToDashCase: function (camel) {
var mapped = Polymer.CaseMap._caseMap[camel];
if (mapped) {
return mapped;
}
return Polymer.CaseMap._caseMap[camel] = camel.replace(/([a-z][A-Z])/g, function (g) {
return g[0] + '-' + g[1].toLowerCase();
});
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
var property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value !== null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value;
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return debouncer && debouncer.finish;
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.version = '1.2.3';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (var i = 1; i < rowCount; i++) {
for (var j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
var splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
c$ = composed ? node._composedChildren : c$;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
var nativeAppendChild = Element.prototype.appendChild;
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
var wrap = window.wrap ? window.wrap : function (node) {
return node;
};
var DomApi = function (node) {
this.node = needsToWrap ? wrap(node) : node;
if (this.patch) {
this.patch();
}
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var wrappedDocument = wrap(document);
while (n && n !== wrappedDocument && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this._addNode(node);
},
insertBefore: function (node, ref_node) {
return this._addNode(node, ref_node);
},
_addNode: function (node, ref_node) {
this._removeNodeFromParent(node);
var addedInsertionPoint;
var root = this.getOwnerRoot();
if (root) {
addedInsertionPoint = this._maybeAddInsertionPoint(node, this.node);
}
if (this._nodeHasLogicalChildren(this.node)) {
if (ref_node) {
var children = this.childNodes;
var index = children.indexOf(ref_node);
if (index < 0) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
}
this._addLogicalInfo(node, this.node, index);
}
this._addNodeToHost(node);
if (!this._maybeDistribute(node, this.node) && !this._tryRemoveUndistributedNode(node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
addToComposedParent(container, node, ref_node);
if (ref_node) {
nativeInsertBefore.call(container, node, ref_node);
} else {
nativeAppendChild.call(container, node);
}
}
if (addedInsertionPoint) {
this._updateInsertionPoints(root.host);
}
this.notifyObserver();
return node;
},
removeChild: function (node) {
if (factory(node).parentNode !== this.node) {
console.warn('The node to be removed is not a child of this node', node);
}
this._removeNodeFromHost(node);
if (!this._maybeDistribute(node, this.node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (container === node.parentNode) {
removeFromComposedParent(container, node);
nativeRemoveChild.call(container, node);
}
}
this.notifyObserver();
return node;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
if (node._ownerShadyRoot === undefined) {
var root;
if (node._isShadyRoot) {
root = node;
} else {
var parent = Polymer.dom(node).parentNode;
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
node._ownerShadyRoot = root;
}
return node._ownerShadyRoot;
},
_maybeDistribute: function (node, parent) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && Polymer.dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && Polymer.dom(fragContent).parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this._ownerShadyRootForNode(parent);
if (root) {
var host = root.host;
this._lazyDistribute(host);
}
}
var parentNeedsDist = this._parentNeedsDistribution(parent);
if (parentNeedsDist) {
this._lazyDistribute(parent);
}
return parentNeedsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = factory(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = factory(n).parentNode;
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
saveLightChildrenIfNeeded(parent);
saveLightChildrenIfNeeded(node);
added = true;
}
return added;
},
_tryRemoveUndistributedNode: function (node) {
if (this.node.shadyRoot) {
var parent = getComposedParent(node);
if (parent) {
nativeRemoveChild.call(parent, node);
}
return true;
}
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = factory(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(factory(c).parentNode);
}
},
_nodeHasLogicalChildren: function (node) {
return Boolean(node._lightChildren !== undefined);
},
_parentNeedsDistribution: function (parent) {
return parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot);
},
_removeNodeFromParent: function (node) {
var parent = node._lightParent || node.parentNode;
if (parent && hasDomApi(parent)) {
factory(parent).notifyObserver();
}
this._removeNodeFromHost(node, true);
},
_removeNodeFromHost: function (node, ensureComposedRemoval) {
var hostNeedsDist;
var root;
var parent = node._lightParent;
if (parent) {
factory(node)._distributeParent();
root = this._ownerShadyRootForNode(node);
if (root) {
root.host._elementRemove(node);
hostNeedsDist = this._removeDistributedChildren(root, node);
}
this._removeLogicalInfo(node, parent);
}
this._removeOwnerShadyRoot(node);
if (root && hostNeedsDist) {
this._updateInsertionPoints(root.host);
this._lazyDistribute(root.host);
} else if (ensureComposedRemoval) {
removeFromComposedParent(getComposedParent(node), node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = factory(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = node.parentNode;
if (parent) {
removeFromComposedParent(parent, node);
nativeRemoveChild.call(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = factory(node).parentNode;
}
},
_addNodeToHost: function (node) {
var root = this.getOwnerRoot();
if (root) {
root.host._elementAdd(node);
}
},
_addLogicalInfo: function (node, container, index) {
var children = factory(container).childNodes;
index = index === undefined ? children.length : index;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var c$ = arrayCopyChildNodes(node);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
children.splice(index++, 0, n);
n._lightParent = container;
}
} else {
children.splice(index, 0, node);
node._lightParent = container;
}
},
_removeLogicalInfo: function (node, container) {
var children = factory(container).childNodes;
var index = children.indexOf(node);
if (index < 0 || container !== node._lightParent) {
throw Error('The node to be removed is not a child of this node');
}
children.splice(index, 1);
node._lightParent = null;
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = factory(node).childNodes;
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = factory(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = factory(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
return this.querySelectorAll(selector)[0];
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return matchesSelector.call(n, selector);
}, this.node);
},
_query: function (matcher, node) {
node = node || this.node;
var list = [];
this._queryElements(factory(node).childNodes, matcher, list);
return list;
},
_queryElements: function (elements, matcher, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
this._queryElement(c, matcher, list);
}
}
},
_queryElement: function (node, matcher, list) {
if (matcher(node)) {
list.push(node);
}
this._queryElements(factory(node).childNodes, matcher, list);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = factory(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._distributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._distributeParent();
},
_distributeParent: function () {
if (this._parentNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = factory(externalNode).childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
}
};
if (!Settings.useShadow) {
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
var c$ = getLightChildren(this.node);
return Array.isArray(c$) ? c$ : arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
configurable: true
},
parentNode: {
get: function () {
return this.node._lightParent || getComposedParent(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return this.childNodes[0];
},
configurable: true
},
lastChild: {
get: function () {
var c$ = this.childNodes;
return c$[c$.length - 1];
},
configurable: true
},
nextSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
firstElementChild: {
get: function () {
return this.children[0];
},
configurable: true
},
lastElementChild: {
get: function () {
var c$ = this.children;
return c$[c$.length - 1];
},
configurable: true
},
nextElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.prototype._getComposedInnerHTML = function () {
return getInnerHTML(this.node, true);
};
} else {
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild'
]);
DomApi.prototype.querySelectorAll = function (selector) {
return arrayCopy(this.node.querySelectorAll(selector));
};
DomApi.prototype.getOwnerRoot = function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
};
DomApi.prototype.importNode = function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
};
DomApi.prototype.getDestinationInsertionPoints = function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? arrayCopy(n$) : [];
};
DomApi.prototype.getDistributedNodes = function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? arrayCopy(n$) : [];
};
DomApi.prototype._distributeParent = function () {
};
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
return arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}
var CONTENT = 'content';
function factory(node, patch) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi(node, patch);
}
return node.__domApi;
}
;
function hasDomApi(node) {
return Boolean(node.__domApi);
}
;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return factory(obj, patch);
}
};
function getLightChildren(node) {
var children = node._lightChildren;
return children ? children : node.childNodes;
}
function getComposedChildren(node) {
if (!node._composedChildren) {
node._composedChildren = arrayCopyChildNodes(node);
}
return node._composedChildren;
}
function addToComposedParent(parent, node, ref_node) {
var children = getComposedChildren(parent);
var i = ref_node ? children.indexOf(ref_node) : -1;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var fragChildren = getComposedChildren(node);
for (var j = 0; j < fragChildren.length; j++) {
addNodeToComposedChildren(fragChildren[j], parent, children, i + j);
}
node._composedChildren = null;
} else {
addNodeToComposedChildren(node, parent, children, i);
}
}
function getComposedParent(node) {
return node.__patched ? node._composedParent : node.parentNode;
}
function addNodeToComposedChildren(node, parent, children, i) {
node._composedParent = parent;
children.splice(i >= 0 ? i : children.length, 0, node);
}
function removeFromComposedParent(parent, node) {
node._composedParent = null;
if (parent) {
var children = getComposedChildren(parent);
var i = children.indexOf(node);
if (i >= 0) {
children.splice(i, 1);
}
}
}
function saveLightChildrenIfNeeded(node) {
if (!node._lightChildren) {
var c$ = arrayCopyChildNodes(node);
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
child._lightParent = child._lightParent || node;
}
node._lightChildren = c$;
}
}
function arrayCopyChildNodes(parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
}
function arrayCopyChildren(parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
}
function arrayCopy(a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
function hasInsertionPoint(root) {
return Boolean(root && root._insertionPoints.length);
}
var p = Element.prototype;
var matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return {
getLightChildren: getLightChildren,
getComposedParent: getComposedParent,
getComposedChildren: getComposedChildren,
removeFromComposedParent: removeFromComposedParent,
saveLightChildrenIfNeeded: saveLightChildrenIfNeeded,
matchesSelector: matchesSelector,
hasInsertionPoint: hasInsertionPoint,
ctor: DomApi,
factory: factory,
hasDomApi: hasDomApi,
arrayCopy: arrayCopy,
arrayCopyChildNodes: arrayCopyChildNodes,
arrayCopyChildren: arrayCopyChildren,
wrap: wrap
};
}();
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
for (var i = 0; i < this._debouncers.length; i++) {
this._debouncers[i].complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var o = this.rootTarget;
while (o) {
path.push(o);
o = Polymer.dom(o).parentNode || o.host;
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
var hasDomApi = Polymer.DomApi.hasDomApi;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function (mxns) {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
var beforeCallListeners = DomApi.EffectiveNodesObserver.prototype._beforeCallListeners;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var hasDomApi = Polymer.DomApi.hasDomApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_poolContent: function () {
if (this._useContent) {
saveLightChildrenIfNeeded(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLightChildren(this._lightChildren);
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
saveLightChildrenIfNeeded(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
var dom = Polymer.dom(this);
if (updateInsertionPoints) {
dom._updateInsertionPoints(this);
}
var host = getTopDistributingHost(this);
dom._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
this.textContent = '';
this._composedChildren = null;
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = getLightChildren(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = p._lightParent || p.parentNode;
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = getLightChildren(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = getComposedChildren(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (getComposedParent(n) === container) {
remove(n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (var j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
ensureComposedParent(container, children);
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
var saveLightChildrenIfNeeded = Polymer.DomApi.saveLightChildrenIfNeeded;
var getLightChildren = Polymer.DomApi.getLightChildren;
var matchesSelector = Polymer.DomApi.matchesSelector;
var hasInsertionPoint = Polymer.DomApi.hasInsertionPoint;
var getComposedChildren = Polymer.DomApi.getComposedChildren;
var getComposedParent = Polymer.DomApi.getComposedParent;
var removeFromComposedParent = Polymer.DomApi.removeFromComposedParent;
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = content._lightParent;
if (parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
function insertBefore(parentNode, newChild, refChild) {
var newChildParent = getComposedParent(newChild);
if (newChildParent !== parentNode) {
removeFromComposedParent(newChildParent, newChild);
}
remove(newChild);
nativeInsertBefore.call(parentNode, newChild, refChild || null);
newChild._composedParent = parentNode;
}
function remove(node) {
var parentNode = getComposedParent(node);
if (parentNode) {
node._composedParent = null;
nativeRemoveChild.call(parentNode, node);
}
}
function ensureComposedParent(parent, children) {
for (var i = 0, n; i < children.length; i++) {
children[i]._composedParent = parent;
}
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = Polymer.dom(host).children;
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (hasDomApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (hasDomApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLightChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: /([^{[]*)(\{\{|\[\[)(?!\}\}|\]\])(.+?)(?:\]\]|\}\})/g,
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var m, lastIndex;
while ((m = re.exec(text)) !== null) {
if (m[1]) {
parts.push({ literal: m[1] });
}
var mode = m[2][0];
var value = m[3].trim();
var negate = false;
if (value[0] == '!') {
negate = true;
value = value.substring(1).trim();
}
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName == 'input' && name == 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
if (kind === 'property') {
name = Polymer.CaseMap.dashToCamelCase(name);
}
return {
kind: kind,
name: name,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
_localSubTree: function (node, host) {
return node === host ? node.childNodes : node._lightChildren || node.childNodes;
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
return !parent ? root : Polymer.Annotations._localSubTree(parent, root)[annote.index];
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
}
this._processAnnotations(this._notes);
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
p.signature = this._parseMethod(p.value);
if (!p.signature) {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
pp[args[kk].model] = true;
}
} else {
pp[p.model] = true;
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function (config) {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend') {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1) {
if (r.reset) {
r.reset();
}
}
}
}
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: function () {
},
upfn: function () {
}
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
var self = this;
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: function () {
},
upfn: function () {
},
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
Gestures.prevent('tap');
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
Gestures.prevent('tap');
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
var detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
var self = this;
if (onload) {
l.onload = function (e) {
return onload.call(self, e);
};
}
if (onerror) {
l.onerror = function (e) {
return onerror.call(self, e);
};
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
_dataEventCache: {},
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, value, fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'computedAnnotation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path));
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
;
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{' && !effect.parts[0].negate;
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var fn = this[effect.method];
if (fn) {
this.__setProperty(effect.name, fn.apply(this, args));
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (args.length > 1 && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect', { attribute: Polymer.CaseMap.camelToDashCase(p) });
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+)\((.*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = {
name: arg,
model: this._modelForPath(arg)
};
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
var pinfo;
if (!node._propertyInfo || !(pinfo = node._propertyInfo[property]) || !pinfo.readOnly) {
this.__setProperty(property, value, true, node);
}
}
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
if (node._configValue) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
node._configValue(x.effect.name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
this._notifyPath(info.path, value, fromAbove);
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
if (last[0] == '#') {
var key = last;
var old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
var old = prop[last];
var key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start, deleteCount) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
var api = {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, s = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^|[\s;])--[^;{]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^|[\s;])?--[^;{]*?:[^{;]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
return api;
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachStyleRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, callback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachStyleRule(this.rulesForStyle(s), callback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
clearStyleRules: function (style) {
style.__cssRules = null;
},
forEachStyleRule: function (node, callback) {
if (!node) {
return;
}
var s = node.parsedSelector;
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
callback(node);
} else if (node.type === this.ruleTypes.KEYFRAMES_RULE || node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachStyleRule(r, callback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.DomApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, c + (c ? ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s, text; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)([^\s>+~]+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(\:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?:\:host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /\:\:content|\:\:shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachStyleRule(rules, function (rule) {
var map = self._mapRule(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRule: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
if (this._template) {
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
if (cssText) {
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
node.className = self._scopeElementClass(node, node.className);
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
n.className = self._scopeElementClass(n, n.className);
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {};
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
});
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
var customCssText = '';
var cssText = rule.parsedCssText;
cssText = cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
var parts = cssText.split(';');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
if (p.match(this.rx.MIXIN_MATCH) || p.match(this.rx.VAR_MATCH)) {
customCssText += p + ';\n';
}
}
return customCssText;
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var pp = p.split(':');
if (pp[1]) {
pp[1] = pp[1].trim();
pp[1] = this.valueForProperty(pp[1], props) || pp[1];
}
p = pp.join(':');
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.filter(function (v) {
return v;
}).join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (rule.cssText && !nativeShadow) {
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, hostSelector + scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.className;
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.className = v;
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,)]*)|(?:[^;]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleUtil = Polymer.StyleUtil;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles ? propertyUtils.decorateStyles(this._styles) : null;
},
customStyle: null,
getComputedStyleValue: function (property) {
return this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector += (selector ? ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepStyleProperties();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_apply: function (deferProperties) {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachStyleRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
var self = this;
function fn() {
self._applyCustomProperties(e);
}
if (this._pendingApplyProperties) {
cancelAnimationFrame(this._pendingApplyProperties);
this._pendingApplyProperties = null;
}
if (deferProperties) {
this._pendingApplyProperties = requestAnimationFrame(fn);
} else {
fn();
}
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function (debouncerExpired) {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (var prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
key = this._parseKey(key);
this._removeFromMap(this.store[key]);
delete this.store[key];
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key[0] == '#') {
return key.slice(1);
}
throw new Error('unexpected key ' + key);
},
setItem: function (key, item) {
key = this._parseKey(key);
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
},
getItem: function (key) {
key = this._parseKey(key);
return this.store[key];
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (var j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (var key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: { computed: '_computeFrameTime(targetFramerate)' }
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
var c = this.collection;
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (var i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var instances = this._instances;
var keyMap = {};
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
var key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (var j = 0; j < s.added.length; j++) {
var key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (var key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (var i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (var i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
var c = this.collection;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (var j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
this._teardownInstance();
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
if (!this._instance) {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self._markImportsReady();
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.DomApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XP = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global,Buffer){
!function(global,browser){"use strict";var AbstractError,AlreadyDefinedError,AlreadyUsedError,ArgumentError,Class,CustomError,DeniedError,ImmutableError,InvalidError,NotFoundError,RejectedError,RequiredError,UnavailableError,UndefinedError,UnknownError,ValidationError,addAttribute,addAttributes,addClass,after,alignElement,and,append,appendChild,apply,ary,assert,assertArgument,assertOption,assign,at,attempt,basicAuth,bearerAuth,before,call,camelCase,camelCaseRegex,capitalize,capitalizeRegex,chunk,clean,clone,cloneDeep,compact,concat,countBy,debounce,deburr,defaults,defineProperties,defineProperty,delay,difference,drop,dropRight,dropRightWhile,dropWhile,endsWith,escape,escapeRegExp,every,fileExtension,fileName,filter,filterElements,find,findDeep,findElement,findElements,findIndex,findKey,findLast,findLastElement,findLastIndex,findLastKey,findNextElement,findNextElements,findParentElement,findPreviousElement,findPreviousElements,findSiblingElement,findSiblingElements,first,fit,fixed,flatten,flattenDeep,flush,forEach,forEachRight,forIn,forInRight,forOwn,forOwnRight,formData,freeze,functions,getAllNext,getAllPrevious,getAllSiblings,getAttribute,getAttributes,getBoundings,getElement,getElementById,getElements,getHeight,getMargin,getNext,getNextElement,getNextElements,getNode,getNodes,getPadding,getPrevious,getPreviousElement,getPreviousElements,getSiblingElements,getSiblings,getStyle,getStyles,getValue,getWidth,getter,groupBy,has,hasAttribute,hasChildren,hasClass,includes,includesDeep,indexBy,indexOf,initial,intersection,invert,invoke,isAny,isArguments,isArray,isArrayable,isBase62,isBindable,isBoolean,isBrowser,isBuffer,isCamelCase,isCapitalize,isClean,isCollection,isDate,isDefined,isElement,isEmpty,isEnumerable,isEqual,isEquivalent,isError,isEscape,isEscapeRegExp,isEven,isEvent,isExotic,isFalse,isFalsy,isFinite,isFloat,isFunction,isHex,isIndex,isInfinite,isInput,isInstance,isInt,isInvalid,isKebabCase,isKeyCase,isLast,isLastIndex,isLowerCase,isNaN,isNative,isNegative,isNode,isNull,isNullable,isNumber,isNumeric,isObject,isObservable,isOdd,isPlainObject,isPolyfilled,isPositive,isPredicate,isPrevented,isPrimitive,isRegExp,isSelector,isShady,isSnakeCase,isStartCase,isString,isTemplate,isTrue,isTruthy,isUniq,isUpperCase,isUuid,isVoid,isWithin,iterate,join,kebabCase,kebabCaseRegex,keyCase,keyCaseRegex,keys,keysIn,last,lastIndexOf,listen,literalOf,localize,lowerCase,lowerCaseRegex,map,mapValues,match,matches,max,memoize,merge,min,mock,moveFirst,moveLast,nand,negate,nor,not,omit,onMutation,once,or,overwrite,pad,padLeft,padRight,pairs,parallel,parseBase62,parseHex,parseJSON,parseURL,partition,percentage,pick,pluck,prefix,prependChild,preventDefault,promise,pull,pullAt,push,random,range,ratio,readable,redirect,reduce,reduceRight,reject,remove,removeAttribute,removeAttributes,removeChild,removeClass,removeStyle,removeStyles,renameElement,repeat,replaceNode,rest,round,sample,seal,setAttribute,setAttributes,setNodes,setStyle,setStyles,setValue,setter,shrink,shuffle,size,slice,snakeCase,snakeCaseRegex,some,sortBy,split,startCase,startCaseRegex,startsWith,stop,stopPropagation,stretch,strip,suffix,take,takeRight,takeRightWhile,takeWhile,throttle,toArray,toBase62,toBoolean,toDOMIdentity,toDOMPredicate,toDefined,toElapsedTime,toHex,toIndex,toInfinite,toInput,toInt,toJSON,toNull,toNumber,toObject,toPosition,toPrimitive,toQueryString,toRegExp,toString,toURL,toUseful,toValue,toggleAttribute,toggleClass,trim,trimLeft,trimRegex,trimRight,trunc,unescape,union,uniq,unlisten,unzip,upperCase,upperCaseRegex,uuid,uuidRegex,value,valueIn,values,valuesIn,waterfall,where,willBleedBottom,willBleedHorizontally,willBleedLeft,willBleedRight,willBleedTop,willBleedVertically,withdraw,within,without,words,wrap,xnor,xor,zip,zipObject,forms=_dereq_("html-json-forms"),lodash=_dereq_("lodash"),url=_dereq_("url"),UUID=_dereq_("uuid"),_=global._=global._||lodash,exp=global.XP=module.exports;exp.AbstractError=AbstractError=function(e,t){CustomError.call(this,"AbstractError",e+" is abstract and should be implemented first",t)},exp.AlreadyDefinedError=AlreadyDefinedError=function(e,t){CustomError.call(this,"AlreadyDefinedError",e+" is already defined",t)},exp.AlreadyUsedError=AlreadyUsedError=function(e,t){CustomError.call(this,"AlreadyUsedError",e+" is already used",t)},exp.ArgumentError=ArgumentError=function(e,t,r){CustomError.call(this,"ArgumentError",(toPosition(e)||"Unknown")+" argument must be "+t,r)},exp.Class=Class=function(name,opt){assertArgument(isString(name,!0),1,"string"),assertArgument(isVoid(opt)||isObject(opt),2,"Object"),opt=opt||{};var Constructor=null,Super=withdraw(opt,"extends")||Function,initialize=withdraw(opt,"initialize")||Super,options=withdraw(opt,"options");return eval("Constructor = function "+name+"() {    var self = this, promised = self._promise;    self.options   = self.options || Constructor.options;    self._snippets = self._snippets || {};    self._promise  = self._promise || (initialize.promise ? promise(arguments, initialize.value, self) : null);    return initialize !== Function && (promised || !initialize.promise) ? initialize.apply(self, arguments) : self;};"),Constructor.prototype=Object.create(Super.prototype,{constructor:{configurable:!0,value:Constructor,writable:!0}}),defineProperties(Constructor,{options:{"static":!0,value:assign({},Super.options,options)}}),defineProperties(Constructor,{"catch":function(e){assertArgument(isFunction(e),1,"Function");var t=this;return t._promise&&t._promise["catch"](e),t},then:function(e){assertArgument(isFunction(e),1,"Function");var t=this;return t._promise&&t._promise.then(e)["catch"](function(){}),t},_assert:{enumerable:!1,value:function(e,t){assertArgument(isObject(e),1,"Object"),assertArgument(isFunction(t),2,"Function");var r=this,n=null;forOwn(e,function(e,t){return n=r["_assert"+capitalize(t)](e)||n,!n}),t(n)}},_insertSnippet:{enumerable:!1,value:function(e,t){assertArgument(isString(e,!0),1,"string"),assertArgument(isFunction(t),2,"Function");var r=this;return push(r._snippets[e]=r._snippets[e]||[],t),r}},_insertSnippets:{enumerable:!1,value:function(e){assertArgument(isObject(e),1,"Object");var t=this;return forOwn(e,function(e,r){t._insertSnippet(r,e)}),t}},_insertedSnippets:{enumerable:!1,value:function(e){return assertArgument(isString(e,!0),1,"string"),this._snippets[e]&&concat([],this._snippets[e])||[]}},_invokeSnippets:{enumerable:!1,value:function(e,t,r){assertArgument(isString(e,!0),1,"string"),assertArgument(isVoid(t)||isArrayable(t),2,"Arrayable"),assertArgument(isVoid(r)||isFunction(r),3,"Function");var n=this,i=function(e){e.apply(null,concat([null],t))};return waterfall(concat([i],n._snippets[e]||[]),r),n}},_removeSnippet:{enumerable:!1,value:function(e,t){assertArgument(isString(e,!0),1,"string"),assertArgument(isFunction(t),2,"Function");var r=this;return r._snippets[e]&&pull(r._snippets[e],t),r}},_removeSnippets:{enumerable:!1,value:function(e){assertArgument(isString(e,!0),1,"string");var t=this;return t._snippets[e]&&flush(t._snippets[e]),t}},options:{set:function(e){return assign(this.options||{},e)}},_snippets:{enumerable:!1,set:function(e){return assign(this._snippets||{},e)}},_promise:{enumerable:!1,validate:function(e){return!isVoid(e)&&!isObject(e)&&"Object"}}}),defineProperties(Constructor,opt)},exp.CustomError=CustomError=function(e,t,r){var n=Error.call(this,t||"");this.name=n.name=e,this.message=n.message,this.stack=n.stack,this.code=n.code=r},exp.DeniedError=DeniedError=function(e,t){CustomError.call(this,"DeniedError",e+" is denied",t)},exp.ImmutableError=ImmutableError=function(e,t){CustomError.call(this,"ImmutableError",e+" cannot be changed",t)},exp.InvalidError=InvalidError=function(e,t){CustomError.call(this,"InvalidError",e+" is not valid",t)},exp.NotFoundError=NotFoundError=function(e,t){CustomError.call(this,"NotFoundError",e+" is not found",t)},exp.RejectedError=RejectedError=function(e,t){CustomError.call(this,"RejectedError",e+" is rejected",t)},exp.RequiredError=RequiredError=function(e,t){CustomError.call(this,"RequiredError",e+" is required",t)},exp.UnavailableError=UnavailableError=function(e,t){CustomError.call(this,"UnavailableError",e+" is not available",t)},exp.UndefinedError=UndefinedError=function(e,t){CustomError.call(this,"UndefinedError",e+" is not defined",t)},exp.UnknownError=UnknownError=function(e){CustomError.call(this,"UnknownError","Unknown error",e)},exp.ValidationError=ValidationError=function(e,t,r){CustomError.call(this,"ValidationError",e+" must be "+t,r)},exp.addAttribute=addAttribute=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),e&&t&&e.setAttribute(t,""),e},exp.addAttributes=addAttributes=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||!isArrayable(t),2,"Arrayable"),e&&t&&forEach(t,function(t){addAttribute(e,t)}),e},exp.addClass=addClass=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),e&&t&&e.classList.add(t),e},exp.after=after=function(e,t){return assertArgument(isIndex(e),1,"number"),assertArgument(isFunction(t),2,"Function"),_.after(e,t)},exp.alignElement=alignElement=function(e,t,r,n){if(assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isElement(t),2,"Element"),assertArgument(isVoid(r)||isString(r),3,"string"),e){setStyles(e,{position:"fixed",bottom:null,left:0,right:null,top:0});var i,s=getHeight(),o=getWidth(),u=getMargin(e),a=getBoundings(e),l=getBoundings(t||global.document.documentElement);return a.left=l.left+("aside"===r?l.width:n||!t?l.width/2-a.width/2:0)-u.left,a.top=l.top+("baseline"===r?l.height:t?0:l.height/2-a.height/2)-u.top,willBleedRight(a,u)&&(a.left="aside"===r?a.left-(l.width+a.width):o-(u.left+a.width+u.right)),willBleedLeft(a,u)&&(a.left="aside"!==r||willBleedHorizontally(a,u)?0:o-(u.left+a.width+u.right)),willBleedBottom(a,u)&&(a.top=s-(u.top+a.height+u.bottom)),willBleedTop(a,u)&&(a.top=0),setStyles(e,{left:a.left+"px",right:willBleedRight(a,u)?"0px":null}),setStyles(e,{top:a.top+"px",bottom:willBleedBottom(a,u)?"0px":null}),i=getBoundings(e),(i.left-=u.left)!==a.left&&setStyles(e,{left:2*a.left-i.left+"px",right:willBleedRight(a,u)?a.left-i.left+"px":null}),(i.top-=u.top)!==a.top&&setStyles(e,{top:2*a.top-i.top+"px",bottom:willBleedBottom(a,u)?a.top-i.top+"px":null}),e}},exp.and=and=function(e,t){return Boolean(e&&t)},exp.append=append=function(e,t){return assertArgument(isString(e)||isArray(e),1,"Array or string"),includes(e,t)?isString(e)?e:t:push(e,t)},exp.appendChild=appendChild=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isNode(t),2,"Node"),e&&t?e.appendChild(t):void 0},exp.apply=apply=function(e,t,r){return assertArgument(isString(t,!0),2,"string"),assertArgument(isVoid(r)||isArrayable(r),3,"Arrayable"),!isVoid(e)&&isFunction(e[t])?e[t].apply(e,toArray(r)||[]):void 0},exp.ary=ary=function(e,t){return assertArgument(isFunction(e),1,"Function"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.ary(e,t)},exp.assert=assert=function(e,t){return!e&&isFunction(t)?t():void 0},exp.assertArgument=assertArgument=function(e,t,r){assert(e,function(){throw new ArgumentError(t,r)})},exp.assertOption=assertOption=function(e,t,r){assert(e,function(){throw new ValidationError(t,r)})},exp.assign=assign=function(e,t,r){return assertArgument(isObject(e),1,"Object"),_.assign.apply(_,filter(arguments,ary(isBindable,1)))},exp.at=at=function(e,t){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(t=toArray(t),2,"Arrayable"),_.at(e,t)},exp.attempt=attempt=function(e,t){function r(){var e=slice(arguments);delay(function(){n.apply(null,e)})}assertArgument(isFunction(e),1,"Function"),assertArgument(isVoid(t)||isFunction(t),2,"Function");var n=t||mock();try{e(r)}catch(i){n(i,null)}},exp.basicAuth=basicAuth=function(e,t){return assertArgument(isString(e,!0),1,"string"),assertArgument(isString(t,!0),2,"string"),"Basic "+new Buffer(e+":"+t).toString("base64")},exp.bearerAuth=bearerAuth=function(e){return assertArgument(isString(e,!0),1,"string"),"Bearer "+e},exp.before=before=function(e,t){return assertArgument(isIndex(e),1,"number"),assertArgument(isFunction(t),2,"Function"),_.before(e,t)},exp.call=call=function(e,t,r){return assertArgument(isString(t,!0),2,"string"),!isVoid(e)&&isFunction(e[t])?e[t].apply(e,slice(arguments,2)):void 0},exp.camelCase=camelCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.camelCase(_.trim(e)):""},exp.camelCaseRegex=camelCaseRegex=/^([a-z]|[\d](?![a-z]))+([A-Z]*([a-z]|[\d](?![a-z]))*)+$|^$/,exp.capitalize=capitalize=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.capitalize(_.trim(e)):""},exp.capitalizeRegex=capitalizeRegex=/^[^\sa-z](\S*)$|^$/,exp.chunk=chunk=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.chunk(e,t)},exp.clean=clean=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?trim(e.replace(/[ ]+/g," ")):""},exp.clone=clone=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isVoid(t)||isFunction(t),2,"Function"),_.clone(e,t,r)},exp.cloneDeep=cloneDeep=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isVoid(t)||isFunction(t),2,"Function"),_.cloneDeep(e,t,r)},exp.compact=compact=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.compact(e)},exp.concat=concat=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),slice(arguments,1).forEach(function(t){isDefined(t=toArray(t))&&t.forEach(function(t){e.push(t)})}),e},exp.countBy=countBy=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.countBy(e,t,r)},exp.debounce=debounce=function(e,t,r){return assertArgument(isFunction(e),1,"Function"),assertArgument(isVoid(t)||isIndex(t),2,"number"),assertArgument(isVoid(r)||isObject(r),3,"Object"),_.debounce(e,t,r)},exp.deburr=deburr=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.deburr(e):""},exp.defaults=defaults=function(e,t){return assertArgument(isObject(e),1,"Object"),_.defaults.apply(_,filter(arguments,ary(isObject,1)))},exp.defineProperties=defineProperties=function(e,t){return assertArgument(isFunction(e)||isObject(e),1,"Function or Object"),assertArgument(isObject(t),2,"Object"),forOwn(t,function(t,r){defineProperty(e,r,t)}),e},exp.defineProperty=defineProperty=function(e,t,r){assertArgument(isFunction(e)||isObject(e),1,"Function or Object"),assertArgument(isString(t,!0),2,"string"),assertArgument(isFunction(r)||isObject(r),3,"Function or Object"),r=isFunction(r)?{value:r}:r,r.defined=!1,r.enumerable=value(r,"enumerable",!0);var n=r.value,i=isFunction(r.get),s=isFunction(r.set),o=isFunction(r.validate),u=!i&&!s;return u&&r.promise&&(r.value=function(){return promise(arguments,n,this)}),i&&!s&&(r.set=function(e){return e}),!s||i||o||(r.validate=mock()),isFunction(e)&&!r["static"]&&(e=e.prototype),Object.defineProperty(e,t,assign({configurable:!0,enumerable:r.enumerable},u?{value:value(r,"value"),writable:value(r,"writable",!0)}:{get:i?r.get:function(){return value(this,t+"_")},set:i?r.set:function(e){var n=this,i=t+"_",s=n[i],o=r.set.call(n,e),u=r.validate.call(n,o);if(u)throw new ValidationError(t,u,500);(r.defined=r.defined||has(n,i))?n[i]=o:Object.defineProperty(n,i,{configurable:r.defined=!0,enumerable:r.enumerable,writable:!0,value:o}),r.sealed&&seal(o),r.frozen&&freeze(o),r.then&&r.then.call(n,o,s)}})),u&&r.sealed&&seal(e[t]),u&&r.frozen&&freeze(e[t]),e},exp.delay=delay=function e(t,r,n){return assertArgument(isFunction(t),1,"Function"),assertArgument(isVoid(r)||isIndex(r),2,"number"),r>0&&!n?_.delay(t,r):_.defer(function(){r>1?e(t,r-1,n):t()})},exp.difference=difference=function(e,t){return _.difference.apply(_,map(filter(arguments,ary(isArrayable,1)),ary(toArray,1)))},exp.drop=drop=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.drop(e,t)},exp.dropRight=dropRight=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.dropRight(e,t)},exp.dropRightWhile=dropRightWhile=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isPredicate(t),2,"Function | Object | string"),_.dropRightWhile(e,t,r)},exp.dropWhile=dropWhile=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isPredicate(t),2,"Function | Object | string"),_.dropWhile(e,t,r)},exp.endsWith=endsWith=function(e,t,r){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),assertArgument(isVoid(r)||isString(r),3,"string"),_.endsWith(e,(r||"")+(t||""))},exp.escape=escape=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.escape(e):""},exp.escapeRegExp=escapeRegExp=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.escapeRegExp(e):""},exp.every=every=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.every(e,t,r)},exp.fileExtension=fileExtension=function(e){assertArgument(isVoid(e)||isString(e),1,"string");var t=e?e.lastIndexOf("."):-1;return t>0?e.slice(t+1):""},exp.fileName=fileName=function(e){assertArgument(isVoid(e)||isString(e),1,"string");var t=e?e.lastIndexOf("."):-1;return t>0?e.slice(0,t):""},exp.filter=filter=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.filter(e,t,r)},exp.filterElements=filterElements=function(e,t){var r=toDOMPredicate(t);return assertArgument(isArrayable(e),1,"Arrayable"),assertArgument(r,2,"Function or string"),filter(e,r)},exp.find=find=function(e,t,r){var n=toIndex(t);return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t)||isIndex(n),2,"Function, number, Object or string"),isIndex(n)?e[n]:isPredicate(t)?_.find(e,t,r):void 0},exp.findDeep=findDeep=function t(e,r,n){return assertArgument(isCollection(e),1,"Arrayable or Object"),assertArgument(isPredicate(r),2,"Function, Object or string"),assertArgument(isVoid(n)||isString(n),3,"string"),n&&(e=value(e,n)),!n||isCollection(e)?find(e,r)||reduce(e,function(e,i){return e||(isCollection(i)?t(i,r,n):void 0)}):void 0},exp.findElement=findElement=function(e,t,r){var n=toDOMIdentity(t);return assertArgument(isNode(e),1,"Node"),assertArgument(n,2,"Element, Function, Object or string"),find(filterElements(getNodes(e),r),n)},exp.findElements=findElements=function(e,t,r){var n=toDOMPredicate(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Function, Object or string"),filter(filterElements(getNodes(e),r),n)},exp.findIndex=findIndex=function(e,t,r){assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isPredicate(t),2,"Function | Object | string");var n=_.findIndex(e,t,r);return isIndex(n)?n:void 0},exp.findKey=findKey=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isPredicate(t),2,"Function | Object | string"),_.findKey(e,t,r)},exp.findLast=findLast=function(e,t,r){var n=toIndex(t);return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t)||isIndex(n),2,"Function, number, Object or string"),isIndex(n)?e[n]:isPredicate(t)?_.findLast(e,t,r):void 0},exp.findLastElement=findLastElement=function(e,t,r){var n=toDOMIdentity(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Element, Function, Object or string"),findLast(filterElements(getNodes(e),r),n)},exp.findLastIndex=findLastIndex=function(e,t,r){assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isPredicate(t),2,"Function | Object | string");var n=_.findLastIndex(e,t,r);return isIndex(n)?n:void 0},exp.findLastKey=findLastKey=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isPredicate(t),2,"Function | Object | string"),_.findLastKey(e,t,r)},exp.findNextElement=findNextElement=function(e,t,r){var n=toDOMIdentity(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Element, Function or string"),find(filterElements(getNextElements(e),r),n)},exp.findNextElements=findNextElements=function(e,t,r){var n=toDOMPredicate(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Function, Object or string"),filter(filterElements(getNextElements(e),r),n)},exp.findParentElement=findParentElement=function(e,t,r){if(assertArgument(isNode(e),1,"Node"),assertArgument(isVoid(t)||isSelector(t),2,"string"),assertArgument(isVoid(r)||isNode(r),3,"Node"),e!==r){do e=e.parentNode||e.host;while(e&&(1!==e.nodeType||t&&!matches(e,t))&&e!==r);return!isNode(e,1)||t&&!matches(e,t)?void 0:e}},exp.findPreviousElement=findPreviousElement=function(e,t,r){var n=toDOMIdentity(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Element, Function or string"),findLast(filterElements(getPreviousElements(e),r),n)},exp.findPreviousElements=findPreviousElements=function(e,t,r){var n=toDOMPredicate(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Function or string"),filter(filterElements(getPreviousElements(e),r),n)},exp.findSiblingElement=findSiblingElement=function(e,t,r){var n=toDOMIdentity(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Element, Function or string"),findPreviousElement(e,t,r)||findNextElement(e,t,r)},exp.findSiblingElements=findSiblingElements=function(e,t,r){var n=toDOMPredicate(t);return assertArgument(isNode(e),1,"Element"),assertArgument(n,2,"Function, Object or string"),filter(filterElements(getSiblingElements(e),r),n)},exp.first=first=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.first(e)},exp.fit=fit=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isIndex(t),2,"number"),e.length<t?stretch(e,t,r):shrink(e,t,r)},exp.fixed=fixed=function(e,t){assertArgument(isFinite(e),1,"number"),assertArgument(isVoid(t)||isIndex(t),2,"number");var r=round(e,t).toString();return t&&(r=append(r,".")),t&&(r+=repeat("0",t+r.indexOf(".")+1-r.length)),r},exp.flatten=flatten=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.flatten(e)},exp.flattenDeep=flattenDeep=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.flattenDeep(e)},exp.flush=flush=function(e){if(assertArgument(isCollection(e=toArray(e)||e)||isElement(e),1,"Arrayable, Element or Object"),isArray(e)){for(;e.length;)e.pop();return e}return isElement(e)?(e.innerHTML="",e):(isObject(e)&&forOwn(e,function(t,r){delete e[r]}),e)},exp.forEach=forEach=function(e,t,r){return assertArgument(isCollection(e),1,"Arrayable or Object"),assertArgument(isFunction(t),2,"Function"),_.forEach(e,t,r)},exp.forEachRight=forEachRight=function(e,t,r){return assertArgument(isCollection(e),1,"Arrayable or Object"),assertArgument(isFunction(t),2,"Function"),_.forEachRight(e,t,r)},exp.forIn=forIn=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isFunction(t),2,"Function"),_.forIn(e,t,r)},exp.forInRight=forInRight=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isFunction(t),2,"Function"),_.forInRight(e,t,r)},exp.forOwn=forOwn=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isFunction(t),2,"Function"),_.forOwn(e,t,r)},exp.forOwnRight=forOwnRight=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isFunction(t),2,"Function"),_.forOwn(e,t,r)},exp.formData=formData=function(e){assertArgument(isElement(e),1,"Element");var t=forms.encode(e);return delete t[""],t},exp.freeze=freeze=function(e){return assertArgument(isBindable(e,!0),1,"Array, Function or Object"),Object.freeze(e)},exp.functions=functions=function(e){return assertArgument(isObject(e),1,"Object"),_.functions(e)},exp.getAllNext=getAllNext=function(e,t){assertArgument(e=toArray(e),1,"Arrayable");var r=indexOf(e,t);return isIndex(r)?slice(e,r+1):[]},exp.getAllPrevious=getAllPrevious=function(e,t){assertArgument(e=toArray(e),1,"Arrayable");var r=indexOf(e,t);return isIndex(r)?slice(e,0,r):[]},exp.getAllSiblings=getAllSiblings=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),concat(getAllPrevious(e,t),getAllNext(e,t))},exp.getAttribute=getAttribute=function(e,t){return assertArgument(isElement(e),1,"Element"),assertArgument(isString(t,!0),2,"string"),e.getAttribute(t)},exp.getAttributes=getAttributes=function(e,t){assertArgument(isElement(e),1,"Element"),assertArgument(isVoid(t)||isArrayable(t),2,"Arrayable");var r={};return forEach(t||[],function(t){r[t]=getAttribute(e,t)}),forEach(t?[]:e.attributes,function(e){r[e.name]=e.value}),r},exp.getBoundings=getBoundings=function(e){assertArgument(isElement(e),1,"Element");var t=e.getBoundingClientRect();return{bottom:t.bottom,height:t.height,left:t.left,right:t.right,top:t.top,width:t.width}},exp.getElement=getElement=function(e,t){isSelector(e)&&(t=e,e=global.document),assertArgument(isElement(e)||isNode(e,9)||isNode(e,10),1,"Element or HTMLDocument"),assertArgument(isVoid(t)||isSelector(t),2,"string");var r=e.queryEffectiveChildren?"queryEffectiveChildren":"querySelector";return isSelector(t)?e[r](t)||void 0:isElement(e)?findElement(e,t):findElement(e.body,t)},exp.getElementById=getElementById=function(e,t){return isSelector(e)&&(t=e,e=global.document),assertArgument(isNode(e,9),1,"HTMLDocument"),assertArgument(isString(t,!0),2,"string"),e.getElementById(t)||void 0},exp.getElements=getElements=function(e,t){isSelector(e)&&(t=e,e=document),assertArgument(isNode(e),1,"Node"),assertArgument(isVoid(t)||isSelector(t),2,"string");var r=e.queryAllEffectiveChildren?"queryAllEffectiveChildren":"querySelectorAll";return isSelector(t)?toArray(e[r](t)):isNode(e)?findElements(e,t):findElements(e.body,t)},exp.getHeight=getHeight=function(e){return assertArgument(isVoid(e)||isElement(e),1,"Element"),Math.floor(e?getBoundings(e).height:global.innerHeight)},exp.getMargin=getMargin=function(e){assertArgument(isElement(e),1,"Element");var t=["bottom","left","right","top"],r="margin-";return zipObject(t,map(getStyles(e,map(t,function(e){return r+e})),ary(toNumber,1)))},exp.getNext=getNext=function(e,t){assertArgument(e=toArray(e),1,"Arrayable");var r=indexOf(e,t);return isIndex(r)?e[r+1]:void 0},exp.getNextElement=getNextElement=function(e){return assertArgument(isNode(e),1,"Element"),getNext(e.parentNode.children,e)},exp.getNextElements=getNextElements=function(e){return assertArgument(isNode(e),1,"Element"),getAllNext(e.parentNode.children,e)},exp.getNode=getNode=function(e,t){return assertArgument(isNode(e),1,"Element"),assertArgument(isIndex(t),2,"number"),(e.getEffectiveChildNodes?e.getEffectiveChildNodes():e.childNodes)[t]},exp.getNodes=getNodes=function(e){return assertArgument(isNode(e),1,"Element"),toArray(e.getEffectiveChildNodes?e.getEffectiveChildNodes():e.childNodes)},exp.getPadding=getPadding=function(e){assertArgument(isElement(e),1,"Element");var t=["bottom","left","right","top"],r="padding-";return zipObject(t,map(getStyles(e,map(t,function(e){return r+e})),ary(toNumber,1)))},exp.getPrevious=getPrevious=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),e[indexOf(e,t)-1]},exp.getPreviousElement=getPreviousElement=function(e){return assertArgument(isNode(e),1,"Element"),getPrevious(e.parentNode.children,e)},exp.getPreviousElements=getPreviousElements=function(e){return assertArgument(isNode(e),1,"Element"),getAllPrevious(e.parentNode.children,e)},exp.getSiblingElements=getSiblingElements=function(e){return assertArgument(isNode(e),1,"Element"),getAllSiblings(e.parentNode.children,e)},exp.getSiblings=getSiblings=function(e,t){assertArgument(e=toArray(e),1,"Arrayable");var r=getPrevious(e,t),n=getNext(e,t);return concat(r?[r]:[],n?[n]:[])},exp.getStyle=getStyle=function(e,t){return assertArgument(isElement(e),1,"Element"),assertArgument(isString(t,!0),2,"string"),global.getComputedStyle(e)[t]},exp.getStyles=getStyles=function(e,t){assertArgument(isElement(e),1,"Element"),assertArgument(isVoid(t)||isArrayable(t),2,"Arrayable");var r=global.getComputedStyle(e);return t?pick(r,t):assign({},r)},exp.getValue=getValue=function(e,t){return assertArgument(isElement(e),1,"Element"),assertArgument(isVoid(t)||isIndex(t),2,"number"),"checkbox"===e.type?t>=0?e.checked?e.value||null:void 0:!!e.checked:"radio"===e.type?e.checked?e.value||null:void 0:"number"===e.type?e.value?toNumber(e.value):null:"range"===e.type?e.value?toNumber(e.value):null:"file"!==e.type?toString(e.value)||null:void 0},exp.getWidth=getWidth=function(e){return assertArgument(isVoid(e)||isElement(e),1,"Element"),Math.floor(e?getBoundings(e).width:global.innerWidth)},exp.getter=getter=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),e?(t?"_":"")+camelCase("get-"+e):""},exp.groupBy=groupBy=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.groupBy(e,t,r)},exp.has=has=function(e,t){return assertArgument(isBindable(e,!0),1,"Array, Function or Object"),assertArgument(isString(t),2,"string"),_.has(e,t)},exp.hasAttribute=hasAttribute=function(e,t){return assertArgument(isElement(e),1,"Element"),assertArgument(isString(t,!0),2,"string"),e.hasAttribute(t)},exp.hasChildren=hasChildren=function(e){return assertArgument(isNode(e),1,"Element"),!!findElement(e,function(e){return 1===e.nodeType&&"TEMPLATE"===e.tagName?!1:3!==e.nodeType||trim(e.textContent,"\r\n ")?!0:!1})},exp.hasClass=hasClass=function(e,t){return assertArgument(isElement(e),1,"Element"),assertArgument(isString(t,!0),2,"string"),e.classList.contains(t)},exp.includes=includes=function(e,t,r){return assertArgument(isString(e)||isCollection(e=toArray(e)||e),1,"Arrayable, Object or string"),assertArgument(isVoid(r)||isFinite(r),3,"number"),_.includes(e,t,r)},exp.includesDeep=includesDeep=function(e,t){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),!!findDeep(e,function(e){return e===t})},exp.indexBy=indexBy=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.indexBy(e,t,r)},exp.indexOf=indexOf=function(e,t,r){assertArgument(isString(e)||isDefined(e=toArray(e)),1,"Arrayable or string"),assertArgument(isVoid(r)||isFinite(r),3,"number");var n=isArray(e)?_.indexOf(e,t,r):isString(t)?e.indexOf(t):-1;return isIndex(n)?n:void 0},exp.initial=initial=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.initial(e)},exp.intersection=intersection=function(e){return _.intersection.apply(_,map(filter(arguments,ary(isArrayable,1)),ary(toArray,1)))},exp.invert=invert=function(e,t){return assertArgument(isObject(e),1,"Object"),_.invert(e,!!t)},exp.invoke=invoke=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isString(t,!0),2,"Function or string"),_.invoke.apply(_,concat([e,t],slice(arguments,2)))},exp.isAny=isAny=function(e){return!isNullable(e)},exp.isArguments=isArguments=function(e,t){return _.isArguments(e)&&(isVoid(t)||xnor(e.length,t))},exp.isArray=isArray=function(e,t){return _.isArray(e)&&(isVoid(t)||xnor(e.length,t))},exp.isArrayable=isArrayable=function(e,t){return!!e&&"object"==typeof e&&isIndex(e.length)&&(isVoid(t)||xnor(e.length,t))},exp.isBase62=isBase62=function(e){return isString(e)&&/^[0-9A-Za-z]+$/.test(e)},exp.isBindable=isBindable=function(e,t){return isArray(e)||isFunction(e)||isObject(e)||!t&&isVoid(e);
},exp.isBoolean=isBoolean=function(e,t){return _.isBoolean(e)||t&&("false"===e||"true"===e)},exp.isBrowser=isBrowser=function(){return browser},exp.isBuffer=isBuffer=function(e){return Buffer.isBuffer(e)},exp.isCamelCase=isCamelCase=function(e,t){return isString(e)&&camelCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isCapitalize=isCapitalize=function(e,t){return isString(e)&&capitalizeRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isClean=isClean=function(e,t){return isString(e)&&e===clean(e)&&(isVoid(t)||xnor(e.length,t))},exp.isCollection=isCollection=function(e,t){return isArrayable(e,t)||isObject(e,t)},exp.isDate=isDate=function(e){return _.isDate(e)},exp.isDefined=isDefined=function(e){return void 0!==e},exp.isElement=isElement=function(e,t){return _.isElement(e)||isPolyfilled(e)||isShady(e)&&1===e.node.nodeType?!isVoid(t)&&xor(t,find(e.childNodes,function(e){return 1!==e.nodeType||"TEMPLATE"!==e.tagName}))?!1:!0:!1},exp.isEmpty=isEmpty=function(e){return isVoid(e)||isString(e,!1)||isArrayable(e,!1)||isObject(e,!1)||isElement(e,!1)},exp.isEnumerable=isEnumerable=function(e,t){return assertArgument(isBindable(t),2,"Array, Function or Object"),isString(e,!0)&&has(t,e)&&t.propertyIsEnumerable(e)},exp.isEqual=isEqual=function(e,t,r,n){return assertArgument(isVoid(r)||isFunction(r),3,"Function"),_.isEqual(e,t,r,n)},exp.isEquivalent=isEquivalent=function(e,t){return toJSON(e,!0)===toJSON(t,!0)},exp.isError=isError=function(e){return _.isError(e)},exp.isEscape=isEscape=function(e,t){return isString(e)&&e===escape(e)&&(isVoid(t)||xnor(e.length,t))},exp.isEscapeRegExp=isEscapeRegExp=function(e,t){return isString(e)&&e===escapeRegExp(e)&&(isVoid(t)||xnor(e.length,t))},exp.isEven=isEven=function(e,t){return isFinite(e)&&e%2===0&&(isVoid(t)||xnor(e>=0,t))},exp.isEvent=isEvent=function(e,t){return e&&e.type&&e.preventDefault&&e.stopPropagation&&(isVoid(t)||e.type===t)?!0:!1},exp.isExotic=isExotic=function(e){return!isDefined(e)||isNaN(e)||isInfinite(e)},exp.isFalse=isFalse=function(e){return e===!1},exp.isFalsy=isFalsy=function(e){return!e},exp.isFinite=isFinite=function(e,t){return _.isFinite(e)&&(isVoid(t)||xnor(e>=0,t))},exp.isFloat=isFloat=function(e,t){return isFinite(e)&&e%1!==0&&(isVoid(t)||xnor(e>=0,t))},exp.isFunction=isFunction=function(e){return _.isFunction(e)},exp.isHex=isHex=function(e){return isString(e)&&/^[0-9A-Fa-f]+$/.test(e)},exp.isIndex=isIndex=function(e){return isInt(e,!0)},exp.isInfinite=isInfinite=function(e){return e===1/0||e===-(1/0)},exp.isInput=isInput=function(e,t){return isFinite(e)||isString(e,t)},exp.isInstance=isInstance=function(e,t){return assertArgument(isFunction(t),2,"Function"),e instanceof t},exp.isInt=isInt=function(e,t){return isFinite(e)&&e%1===0&&(isVoid(t)||xnor(e>=0,t))},exp.isInvalid=isInvalid=function(e){return isElement(e)&&!!e.willValidate&&!!e.checkValidity&&!e.disabled&&!e.checkValidity()},exp.isKebabCase=isKebabCase=function(e,t){return isString(e)&&kebabCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isKeyCase=isKeyCase=function(e,t){return isString(e)&&keyCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isLast=isLast=function(e,t){return assertArgument(isArrayable(t),2,"Arrayable"),!!t.length&&e===t[t.length-1]},exp.isLastIndex=isLastIndex=function(e,t){return assertArgument(isArrayable(t),2,"Arrayable"),!!t.length&&e===t.length-1},exp.isLowerCase=isLowerCase=function(e,t){return isString(e)&&lowerCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isNaN=isNaN=function(e){return _.isNaN(e)},exp.isNative=isNative=function(e){return _.isNative(e)},exp.isNegative=isNegative=function(e){return isNumber(e)&&0>e},exp.isNode=isNode=function(e,t){return e=isShady(e)?e.node:e,e&&(isDefined(e.nodeType)&&isDefined(e.ownerDocument)||isPolyfilled(e))&&(isVoid(t)||e.nodeType===t)?!0:!1},exp.isNull=isNull=function(e){return _.isNull(e)},exp.isNullable=isNullable=function(e){return isVoid(e)||isString(e,!1)||isNaN(e)},exp.isNumber=isNumber=function(e,t){return _.isNumber(e)&&!isNaN(e)&&(isVoid(t)||xnor(e>=0,t))},exp.isNumeric=isNumeric=function(e,t){var r=toNumber(e);return isDefined(r)&&r===1*e&&(isVoid(t)||xnor(r>=0,t))},exp.isObject=isObject=function(e,t){return _.isObject(e)&&!isArray(e)&&!isFunction(e)&&(isVoid(t)||xnor(_.values(e).length,t))},exp.isObservable=isObservable=function(e){return isBindable(e,!0)},exp.isOdd=isOdd=function(e,t){return isFinite(e)&&e%2!==0&&(isVoid(t)||xnor(e>=0,t))},exp.isPlainObject=isPlainObject=function(e,t){return _.isPlainObject(e)&&(isVoid(t)||xnor(_.values(e).length,t))},exp.isPolyfilled=isPolyfilled=function(e){return!(!e||!e.__impl4cf1e782hg__&&!e.__wrapper8e3dd93a60__)},exp.isPositive=isPositive=function(e,t){return isFinite(e)&&e>=0&&(!t||e)},exp.isPredicate=isPredicate=function(e){return isFunction(e)||isObject(e)||isString(e,!0)},exp.isPrevented=isPrevented=function(e){return isEvent(e)&&e.defaultPrevented},exp.isPrimitive=isPrimitive=function(e){return isBoolean(e)||isFinite(e)||isString(e)},exp.isRegExp=isRegExp=function(e){return _.isRegExp(e)},exp.isSelector=isSelector=function(e){return isString(e,!0)},exp.isShady=isShady=function(e){return!!e&&_.has(e,"node")&&_.has(Object.getPrototypeOf(e),"_queryElement")},exp.isSnakeCase=isSnakeCase=function(e,t){return isString(e)&&snakeCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isStartCase=isStartCase=function(e,t){return isString(e)&&startCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isString=isString=function(e,t){return _.isString(e)&&(isVoid(t)||xnor(e.length,t))},exp.isTemplate=isTemplate=function(e){return isElement(e)&&"TEMPLATE"===(e.node||e).tagName},exp.isTrue=isTrue=function(e){return e===!0},exp.isTruthy=isTruthy=function(e){return!!e},exp.isUniq=isUniq=function(e,t){return isArrayable(e)&&e.length===uniq(e).length&&(isVoid(t)||xnor(e.length,t))},exp.isUpperCase=isUpperCase=function(e,t){return isString(e)&&upperCaseRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isUuid=isUuid=function(e,t){return isString(e)&&uuidRegex.test(e)&&(isVoid(t)||xnor(e.length,t))},exp.isVoid=isVoid=function(e){return isNull(e)||!isDefined(e)},exp.isWithin=isWithin=function(e,t,r){return assertArgument(isNumber(t),2,"number"),assertArgument(isVoid(r)||isNumber(r),3,"number"),isNumber(e)&&e>=(isVoid(r)?0:t)&&e<=(isVoid(r)?t:r)},exp.iterate=iterate=function(e,t,r){function n(r){return!r&&(s+=1)<size(o||e)?t(n,e[o?o[s]:s],o?o[s]:s,e):i(r,r?null:e)}assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t),2,"Function"),assertArgument(isVoid(r)||isFunction(r),3,"Function");var i=r||mock(),s=-1,o=isArrayable(e)?null:keys(e);n(null)},exp.join=join=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isString(t),2,"string"),!e.length||Buffer.isBuffer(e[0])?Buffer.concat(e):e.join(t||"")},exp.kebabCase=kebabCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.kebabCase(_.trim(e)):""},exp.kebabCaseRegex=kebabCaseRegex=/^([a-z](?![\d])|[\d](?![a-z]))+(-?([a-z](?![\d])|[\d](?![a-z])))*$|^$/,exp.keyCase=keyCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.camelCase(_.trim(e)).replace(/^(\d+)/,""):""},exp.keyCaseRegex=keyCaseRegex=/^([a-z])+([A-Z]*([a-z]|[\d](?![a-z]))*)+$|^$/,exp.keys=keys=function(e){return assertArgument(isObject(e),1,"Object"),_.keys(e)},exp.keysIn=keysIn=function(e){return assertArgument(isObject(e),1,"Object"),_.keysIn(e)},exp.last=last=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.last(e)},exp.lastIndexOf=lastIndexOf=function(e,t,r){assertArgument(isString(e)||isDefined(e=toArray(e)),1,"Arrayable or string"),assertArgument(isVoid(r)||isFinite(r),3,"number");var n=isArray(e)?_.lastIndexOf(e,t,r):isString(t)?e.lastIndexOf(t):-1;return isIndex(n)?n:void 0},exp.listen=listen=function(e,t,r){return isNode(e)||!isObject(e)&&!isString(e)||(r=t,t=e,e=global),assertArgument(isVoid(e)||isNode(e)||e===global,1,"Element or Window"),assertArgument(isVoid(t)||isObject(t)||isString(t),2,"Object or string"),assertArgument(isVoid(r)||isFunction(r),3,"Function"),isVoid(e)?e:(isObject(t)&&forOwn(t,function(t,r){e.addEventListener(r,t)}),isString(t,!0)&&isFunction(r)&&e.addEventListener(t,r),e)},exp.literalOf=literalOf=function r(e,t,n){var i;return(isArrayable(e)?forEach:forOwn)(e,function(e,s){var o=e!==t&&isCollection(e)?r(e,t,n):void 0;if(e===t||isDefined(o))return s=n||!isNumber(s)?s.toString():"["+s+"]",i=s+(o&&"["!==o[0]?".":"")+(o||""),!1}),i},exp.localize=localize=function n(e,t){return assertArgument(isVoid(e)||isString(e)||isCollection(e),1,"Array, Object or string"),assertArgument(isVoid(t)||isObject(t),2,"Object"),e&&t?isString(e)?value(t,e,e):isArrayable(e)?map(e,function(e){return n(t,e)}):isObject(e)?mapValues(e,function(e,r){return n(t,r)}):void 0:e||""},exp.lowerCase=lowerCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.trim(e).toLowerCase():""},exp.lowerCaseRegex=lowerCaseRegex=/^[^\sA-Z]+[^\sA-Z]*$|^$/,exp.map=map=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.map(e,t,r)},exp.mapValues=mapValues=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isFunction(t)||isString(t),2,"Function or string"),_.mapValues(e,t,r)},exp.match=match=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isRegExp(t),2,"RegExp"),e&&t?e.match(t)||[]:[]},exp.matches=matches=function(e,t){assertArgument(isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string");var r=e.node||e,n=r.matches||r.webkitMatchesSelector||r.mozMatchesSelector||r.msMatchesSelector||r.oMatchesSelector;return!t||n.call(r,t)},exp.max=max=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.max(e,t,r)},exp.memoize=memoize=function(e,t){return assertArgument(isFunction(e),1,"Function"),assertArgument(isVoid(t)||isFunction(t),2,"Function"),_.memoize(e,t)},exp.merge=merge=function(e,t,r){return assertArgument(isObject(e),1,"Object"),_.merge.apply(_,filter(arguments,ary(isBindable,1)))},exp.min=min=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.min(e,t,r)},exp.mock=mock=function(){return function(){}},exp.moveFirst=moveFirst=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isIndex(t),2,"a positive number"),assertArgument(isVoid(r)||isIndex(r),3,"void or a positive number"),e.unshift.apply(e,e.splice(t,r)),e},exp.moveLast=moveLast=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isIndex(t),2,"a positive number"),assertArgument(isVoid(r)||isIndex(r),3,"void or a positive number"),e.push.apply(e,e.splice(t,r)),e},exp.nand=nand=function(e,t){return!and(e,t)},exp.negate=negate=function(e){return assertArgument(isFunction(e),1,"Function"),_.negate(e)},exp.nor=nor=function(e,t){return!or(e,t)},exp.not=not=function(e){return!e},exp.omit=omit=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isString(t)||isArrayable(t)||isFunction(t),2,"Arrayable, Function or string"),_.omit(e,t,r)},exp.onMutation=onMutation=function(e,t,r){assertArgument(isNode(e),1,"Node"),assertArgument(isFunction(t),2,"Function"),assertArgument(isVoid(r)||isObject(r),3,"Object");var n=new global.MutationObserver(function(e){delay(function(){t(e)}),n.disconnect()});return n.observe(e,r||{attributes:!1,characterData:!1,childList:!0,subtree:!0}),n},exp.once=once=function(e){return assertArgument(isFunction(e),1,"Function"),_.once(e)},exp.or=or=function(e,t){return Boolean(e||t)},exp.overwrite=overwrite=function(e,t){assertArgument(isArray(e),1,"Array"),assertArgument(isArrayable(t),2,"Arrayable");var r=e.length!==t.length||reduce(e,function(e,r,n){return e||r!==t[n]});return r&&Array.prototype.splice.apply(e,concat([0,e.length],t)),e},exp.pad=pad=function(e,t,r){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isIndex(t),2,"number"),assertArgument(isVoid(r)||isString(r),3,"string"),_.pad(e,t,r)},exp.padLeft=padLeft=function(e,t,r){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isIndex(t),2,"number"),assertArgument(isVoid(r)||isString(r),3,"string"),_.padLeft(e,t,r)},exp.padRight=padRight=function(e,t,r){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isIndex(t),2,"number"),assertArgument(isVoid(r)||isString(r),3,"string"),_.padRight(e,t,r)},exp.pairs=pairs=function(e){return assertArgument(isObject(e),1,"Object"),_.pairs(e)},exp.parallel=parallel=function(e,t){assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isVoid(t)||isFunction(t),2,"Function");var r=t||mock(),n=size(e),i=isArray(e)?[]:{},s=!1;forEach(e,function(e,t){isFunction(e)&&!s?e(function(e,o){return n-=1,i[t]=o,s?void 0:e?r(s=e,null):n?void 0:r(null,i)}):(n-=1,i[t]=void 0)})},exp.parseBase62=parseBase62=function(e){if(assertArgument(isVoid(e)||isString(e),1,"string"),isBase62(e)){var t=0,r="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",n=e.split("").reverse();return n.forEach(function(e,n){t+=r.indexOf(e)*Math.pow(62,n)}),t}},exp.parseHex=parseHex=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),isHex(e)?parseInt(e,16):void 0},exp.parseJSON=parseJSON=function(e){assertArgument(isVoid(e)||isString(e),1,"string");try{return JSON.parse(e||"")}catch(t){}},exp.parseURL=parseURL=function(e,t,r){assertArgument(isVoid(e)||isString(e),1,"string");var n=e?url.parse(e,!!t,!!r):null;return n?assign(n,{port:toNumber(n.port)||null}):void 0},exp.partition=partition=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.partition(e,t,r)},exp.percentage=percentage=function(e,t,r,n){return 100*ratio(e,t,r,n)},exp.pick=pick=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isString(t)||isArrayable(t)||isFunction(t),2,"Arrayable, Function or string"),_.pick(e,t,r)},exp.pluck=pluck=function(e,t){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isString(t),2,"string"),_.pluck(e,t)},exp.prefix=prefix=function(e,t,r){assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),assertArgument(isVoid(r)||isString(r),3,"string");var n=startsWith(e?e.toLowerCase():"",t?t.toLowerCase():"",r?r.toLowerCase():"");return(t||"")+(r||"")+(e||"").slice(n?(t||"").length+(r||"").length:0)},exp.prependChild=prependChild=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isNode(t),2,"Node"),e&&t&&e.insertBefore(t,e.firstChild),t},exp.preventDefault=preventDefault=function(e){return assertArgument(isVoid(e)||isEvent(e),1,"Event"),e.preventDefault(),e},exp.promise=promise=function(e,t,r){assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isFunction(t),2,"Function"),assertArgument(isBindable(r),3,"Array, Function or Object");var n,i,s,o=new global.Promise(function(r,o){if(isArray(e=fit(e,t.length),!0)){for(s=e.length-1,i=s;i>=0;i-=1)if(isFunction(e[i])){for(n=e[i];s>i;i+=1)e[i]=void 0;break}e[s]=function(e,t){(e?o:r)(e||t)}}});return t.apply(r,e),o["catch"](function(){}),n?(o["catch"](function(e){n(e,null)}),void o.then(function(e){n(null,e)})["catch"](function(){})):o},exp.pull=pull=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),_.pull(e,t)},exp.pullAt=pullAt=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isIndex(t),2,"number"),_.pullAt(e,t)[0]},exp.push=push=function(e,t){return assertArgument(isString(e)||isArray(e),1,"Array or string"),isArray(e)?e[e.push(t)-1]:isString(t)||isFinite(t)?e+t:e},exp.random=random=function(e,t,r){return assertArgument(isVoid(e)||isFinite(e),1,"number"),assertArgument(isVoid(t)||isFinite(t),2,"number"),_.random(e,t,!!r)},exp.range=range=function(e,t,r){return assertArgument(isFinite(e),1,"number"),assertArgument(isVoid(t)||isFinite(t),2,"number"),assertArgument(isVoid(r)||isFinite(r),3,"number"),_.range(e,t,r)},exp.ratio=ratio=function(e,t,r,n){return assertArgument(isNumber(e),1,"number"),assertArgument(isFinite(t),2,"number"),assertArgument(isFinite(r),3,"number"),((n?Math.max(Math.min(e,r),t):e)-t)/(r-t)},exp.readable=readable=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.capitalize(_.snakeCase(_.trim(e)).replace(/_/g," ")):""},exp.redirect=redirect=function(e,t){assertArgument(isString(e),1,"string"),isBrowser()&&(global.location[t?"hash":"href"]=e)},exp.reduce=reduce=function(e,t,r,n){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t),2,"Function"),_.reduce(e,t,r,n)},exp.reduceRight=reduceRight=function(e,t,r,n){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t),2,"Function"),_.reduceRight(e,t,r,n)},exp.reject=reject=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.reject(e,t,r)},exp.remove=remove=function(e,t,r){return assertArgument(isArray(e),1,"Array"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.remove(e,t,r)},exp.removeAttribute=removeAttribute=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),e&&t&&e.removeAttribute(t),e},exp.removeAttributes=removeAttributes=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isArrayable(t),2,"Arrayable"),e&&t&&forEach(t,function(t){removeAttribute(e,t)}),e},exp.removeChild=removeChild=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isNode(t),2,"Node"),e&&t&&e.removeChild(t),t},exp.removeClass=removeClass=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),e&&t&&e.classList.remove(t),e},exp.removeStyle=removeStyle=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t,!0),2,"string"),e&&t&&(e.style[t]=""),e},exp.removeStyles=removeStyles=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isArrayable(t),2,"Arrayable"),e&&t&&forEach(t,function(t){removeStyle(e,t)}),e},exp.renameElement=renameElement=function(e,t){if(assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),!e||!t)return e;var r=global.document.createElement(t);return setAttributes(r,getAttributes(e)),setNodes(r,getNodes(e)),replaceNode(e,r),r},exp.repeat=repeat=function(e,t,r){assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isIndex(t),2,"number"),assertArgument(isVoid(r)||isString(r),3,"string");var n,i="";if(e)for(n=0;t>n;n+=1)i+=(n?r||"":"")+e;return i},exp.replaceNode=replaceNode=function(e,t){return assertArgument(isVoid(e)||isNode(e),1,"Node"),assertArgument(isVoid(t)||isNode(t),2,"Node"),e&&t?e.parentNode.replaceChild(t,e):void 0},exp.rest=rest=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.rest(e)},exp.round=round=function(e,t){return assertArgument(isFinite(e),1,"number"),assertArgument(isVoid(t)||isIndex(t),2,"number"),Math.round(e*(t=Math.pow(10,t||0)))/t},exp.sample=sample=function(e,t){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.sample(e,t)},exp.seal=seal=function(e){return assertArgument(isBindable(e,!0),1,"Array, Function or Object"),Object.seal(e)},exp.setAttribute=setAttribute=function(e,t,r){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),isVoid(r)||isFalse(r)?removeAttribute(e,t):(e&&t&&e.setAttribute(t,toString(r)),e)},exp.setAttributes=setAttributes=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isObject(t),2,"Object"),e&&t&&forOwn(t,function(t,r){setAttribute(e,r,t)}),e},exp.setNodes=setNodes=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isArrayable(t),2,"Arrayable"),e&&t&&(flush(e),forEach(t,function(t){appendChild(e,t)})),e},exp.setStyle=setStyle=function(e,t,r){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),isVoid(r)||isBoolean(r)?removeStyle(e,t):(e&&t&&(e.style[t]=toString(r)),e)},exp.setStyles=setStyles=function(e,t){assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isObject(t)||isString(t),2,"Object or string");var r=e?global.document.createElement("div"):null;return e&&isObject(t)&&forOwn(t,function(t,r){setStyle(e,r,t)}),e&&isString(t)&&forEach(setAttribute(r,"style",t).style,function(t){e.style[t]=r.style[t]}),e},exp.setValue=setValue=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),e&&"checkbox"===e.type&&(e.checked=isArray(t)?t.indexOf(e.value)>=0:toBoolean(t,!0)),e&&"radio"===e.type&&(e.checked=e.value===toString(t)),!e||"number"!==e.type&&"range"!==e.type||(e.value=toString(toNumber(t))),e&&"file"!==e.type&&(e.value=toString(t)),e},exp.setter=setter=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),e?(t?"_":"")+camelCase("set-"+e):""},exp.shrink=shrink=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isIndex(t),2,"number"),e.length>t&&e.splice(t,e.length-t),e},exp.shuffle=shuffle=function(e){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),_.shuffle(e)},exp.size=size=function(e){return assertArgument(isString(e)||isCollection(e=toArray(e)||e),1,"Arrayable, Object or string"),_.size(e)},exp.slice=slice=function(e,t,r){return assertArgument(isVoid(t)||isIndex(t),2,"a positive number"),assertArgument(isVoid(r)||isIndex(r),3,"a positive number"),_.slice(e,t,r)},exp.snakeCase=snakeCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.snakeCase(_.trim(e)):""},exp.snakeCaseRegex=snakeCaseRegex=/^([a-z](?![\d])|[\d](?![a-z]))+(_?([a-z](?![\d])|[\d](?![a-z])))*$|^$/,exp.some=some=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.some(e,t,r)},exp.sortBy=sortBy=function(e,t,r){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.sortBy(e,t,r)},exp.split=split=function(e,t,r){assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string");var n=[],i=(e||"").split(t||"");return i.forEach(function(e){return e=trim(e),e&&n.push(e)}),r&&n.length>1?[n.shift(),n.join(t||"")]:n},exp.startCase=startCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.startCase(_.trim(e)):""},exp.startCaseRegex=startCaseRegex=/^(([A-Z][a-z]*|[0-9]+)[\s])*([A-Z][a-z]*|[0-9]+)$|^$/,exp.startsWith=startsWith=function(e,t,r){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),assertArgument(isVoid(r)||isString(r),3,"string"),_.startsWith(e,(r||"")+(t||""))},exp.stop=stop=function(e){return stopPropagation(preventDefault(e))},exp.stopPropagation=stopPropagation=function(e){return assertArgument(isVoid(e)||isEvent(e),1,"Event"),e.stopPropagation(),e},exp.stretch=stretch=function(e,t,r){for(assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isIndex(t),2,"number");e.length<t;)e.push(r);return e},exp.strip=strip=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isRegExp(t)||isString(t),2,"RegExp or string"),e&&t?e.replace(t,""):e||""},exp.suffix=suffix=function(e,t,r){assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),assertArgument(isVoid(r)||isString(r),3,"string");var n=endsWith(e?e.toLowerCase():"",t?t.toLowerCase():"",r?r.toLowerCase():"");return e.slice(0,n?e.length-(r||"").length-(t||"").length:void 0)+(r||"")+t},exp.take=take=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.take(e,t)},exp.takeRight=takeRight=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isIndex(t),2,"number"),_.takeRight(e,t)},exp.takeRightWhile=takeRightWhile=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.takeRightWhile(e,t,r)},exp.takeWhile=takeWhile=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isPredicate(t),2,"Function, Object or string"),_.takeWhile(e,t,r)},exp.throttle=throttle=function(e,t,r){return assertArgument(isFunction(e),1,"Function"),assertArgument(isVoid(t)||isIndex(t),2,"number"),assertArgument(isVoid(r)||isObject(r),3,"Object"),_.throttle(e,t,r)},exp.toArray=toArray=function(e,t){return isArray(e)?e:isArrayable(e)?slice(e):t?isVoid(e)?[]:[e]:void 0},exp.toBase62=toBase62=function(e){if(isInt(e)){for(var t="",r="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";e>0;)t=r[e%62]+t,e=Math.floor(e/62);return t||"0"}},exp.toBoolean=toBoolean=function(e,t){return isDefined(e)?!!e&&"false"!==e:t?!1:void 0},exp.toDOMIdentity=toDOMIdentity=function(e){if(isElement(e))return function(t){return t===e};if(isFunction(e)||isString(e,!0))return toDOMPredicate(e);if(isVoid(e)||isString(e,!1))return mock();throw new ArgumentError(1,"Element, Function or string")},exp.toDOMPredicate=toDOMPredicate=function(e){if(isFunction(e))return function(t){return isElement(t)&&e.apply(null,arguments)};if(isString(e))return function(t){return isElement(t)&&matches(t,e)};if(isVoid(e))return function(e){return isElement(e)};throw new ArgumentError(1,"Function or string")},exp.toDefined=toDefined=function(e){return isDefined(e)?e:null},exp.toElapsedTime=toElapsedTime=function(e){var t=isFinite(e)?Math.floor((Date.now()-e)/1e3):-1,r=[{value:31536e3,label:"year"},{value:2592e3,label:"month"},{value:86400,label:"day"},{value:3600,label:"hour"},{value:60,label:"minute"},{value:1,label:"second"}];if(!(0>t))return t?reduce(r,function(e,r){var n=!e&&Math.floor(t/r.value);return e||n&&n+" "+r.label+(n>1?"s":"")+" ago"}):"now"},exp.toHex=toHex=function(e){return isInt(e)?e.toString(16).toUpperCase():void 0},exp.toIndex=toIndex=function(e,t){return isIndex(e=toInt(e))?e:t?0:void 0},exp.toInfinite=toInfinite=function(e,t){return isInfinite(e)?e:"-Infinity"===e?-(1/0):"Infinity"===e||t?1/0:void 0},exp.toInput=toInput=function(e,t){return isNumber(e)?e.toString():isString(e)?e:t?"":void 0},exp.toInt=toInt=function(e,t){return isFinite(e=parseInt(e,10))?e:t?0:void 0},exp.toJSON=toJSON=function(e,t,r){return isVoid(e)?"null":JSON.stringify(e,function(e,r){var n=r&&r.toJSON?r.toJSON():r;return isFunction(n)?n.toString():isVoid(n)?t?void 0:null:r},r?"  ":void 0)},exp.toNull=toNull=function(e){return isNullable(e)?null:void 0},exp.toNumber=toNumber=function(e,t){return isFinite(e=parseFloat(e))?e:t?0:void 0},exp.toObject=toObject=function(e,t){return isObject(e)?e:t?{}:void 0},exp.toPosition=toPosition=function(e){if(isIndex(e)){var t=e.toString(),r=t[t.length-1];return"1"===r&&11!==e?t+"st":"2"===r&&12!==e?t+"nd":"3"===r&&13!==e?t+"rd":t+"th"}},exp.toPrimitive=toPrimitive=function(e,t){return assertArgument(isString(t,!0),2,"string"),"boolean"===t?isBoolean(e,!0)?!!e&&"false"!==e:void 0:"number"===t?isNumeric(e)?toNumber(e):void 0:"string"===t&&isPrimitive(e)?e.toString():void 0},exp.toQueryString=toQueryString=function(e,t){if(isDefined(e=toObject(e,t))){var r=map(e,function(e,t){return isBoolean(e)||isFinite(e)||isString(e)?t+"="+encodeURIComponent(e.toString()):void 0});return filter(r,ary(isDefined,1)).join("&")}},exp.toRegExp=toRegExp=function(e){var t,r,n,i;if(!isString(e))return isRegExp(e)?e:void 0;if("/"!==e[0])return e?new RegExp(e):null;for(t=r=!1,n=1,i="";n<e.length&&(t=!r&&"/"===e[n],r=!r&&"\\"===e[n],!t);n+=1)i+=e[n];try{return t&&i?new RegExp(i,e.slice(n+1)):null}catch(s){return null}},exp.toString=toString=function(e){return isVoid(e)||isBoolean(e)?"":isNumber(e)?e.toString():isString(e)?e:JSON.stringify(e,function(e,t){var r=t&&t.toJSON?t.toJSON():t;return isError(r)||isFunction(r)||isRegExp(r)?r.toString():isVoid(t)?null:t})},exp.toURL=toURL=function(e){return isObject(e)?url.format(e):void 0},exp.toUseful=toUseful=function(e){return isNull(e)||isNaN(e)?void 0:e},exp.toValue=toValue=function(e,t){return"false"===e||"true"===e?toBoolean(e):isNumeric(e)?toNumber(e):isString(e)?e:t?null:void 0},exp.toggleAttribute=toggleAttribute=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t),2,"string"),e&&t&&e[e.hasAttribute(t)?"removeAttribute":"setAttribute"](t,""),e},exp.toggleClass=toggleClass=function(e,t){return assertArgument(isVoid(e)||isElement(e),1,"Element"),assertArgument(isVoid(t)||isString(t,!0),2,"string"),e&&t&&e.classList.toggle(t),e},exp.trim=trim=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),e?_.trim(e,t):""},exp.trimLeft=trimLeft=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),e?_.trimLeft(e,t):""},exp.trimRegex=trimRegex=/^(?!\s).*[\S]+$|^$/,exp.trimRight=trimRight=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isString(t),2,"string"),e?_.trimRight(e,t):""},exp.trunc=trunc=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isObject(t),2,"Object"),e?_.trunc(e,t):""},exp.unescape=unescape=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.unescape(e):""},exp.union=union=function(e){return _.union.apply(_,map(filter(arguments,ary(isArrayable,1)),ary(toArray,1)))},exp.uniq=uniq=function(e,t,r){return assertArgument(e=toArray(e),1,"Arrayable"),assertArgument(isVoid(t)||isFunction(t)||isObject(t)||isString(t),2,"Function, Object or string"),_.uniq(e,t,r)},exp.unlisten=unlisten=function(e,t,r){return isNode(e)||!isObject(e)&&!isString(e)||(r=t,t=e,e=global),assertArgument(isVoid(e)||isNode(e)||e===global,1,"Element or Window"),assertArgument(isVoid(t)||isObject(t)||isString(t),2,"Object or string"),assertArgument(isVoid(r)||isFunction(r),3,"Function"),isVoid(e)?e:(isObject(t)&&forOwn(t,function(t,r){e.removeEventListener(r,t)}),isString(t,!0)&&isFunction(r)&&e.removeEventListener(t,r),e)},exp.unzip=unzip=function(e){return assertArgument(e=toArray(e),1,"Arrayable"),_.unzip(e)},exp.upperCase=upperCase=function(e){return assertArgument(isVoid(e)||isString(e),1,"string"),e?_.trim(e).toUpperCase():""},exp.upperCaseRegex=upperCaseRegex=/^[^\sa-z]+[^\sa-z]*$|^$/,exp.uuid=uuid=function(e){return assertArgument(isVoid(e)||isFunction(e),1,"Function"),UUID.v4(e&&{rng:e})},exp.uuidRegex=uuidRegex=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^$/,exp.value=value=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isString(t,!0),2,"string"),has(e,t)?e[t]:r},exp.valueIn=valueIn=function(e,t,r){return assertArgument(isObject(e),1,"Object"),assertArgument(isString(t,!0),2,"string"),isDefined(e[t])?e[t]:r},exp.values=values=function(e){return assertArgument(isObject(e),1,"Object"),_.values(e)},exp.valuesIn=valuesIn=function(e){
return assertArgument(isObject(e),1,"Object"),_.valuesIn(e)},exp.waterfall=waterfall=function(e,t){function r(){var e,t,o=slice(arguments);for(s+=1;s<i.length&&!isFunction(i[s]);s+=1);for(t=s+1;t<i.length&&!isFunction(i[t]);t+=1);e=o.splice(0,1,i[t]?r:n)[0],(!e&&i[s]?i[s]:n).apply(null,e?[e]:o)}assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isVoid(t)||isFunction(t),2,"Function");var n=t||mock(),i=isArray(e)?e:values(e),s=-1;r()},exp.where=where=function(e,t){return assertArgument(isCollection(e=toArray(e)||e),1,"Arrayable or Object"),assertArgument(isObject(t),2,"Object"),_.where(e,t)},exp.willBleedBottom=willBleedBottom=function(e,t){return assertArgument(isObject(e),1,"Object"),assertArgument(isObject(t),2,"Object"),e.top+t.top+e.height+t.bottom>getHeight()},exp.willBleedHorizontally=willBleedHorizontally=function(e,t){return assertArgument(isObject(e),1,"Object"),assertArgument(isObject(t),2,"Object"),t.left+e.width+t.right>getWidth()},exp.willBleedLeft=willBleedLeft=function(e,t){return assertArgument(isObject(e),1,"Object"),assertArgument(isObject(t),2,"Object"),e.left<0},exp.willBleedRight=willBleedRight=function(e,t){return assertArgument(isObject(e),1,"Object"),assertArgument(isObject(t),2,"Object"),e.left+t.left+e.width+t.right>getWidth()},exp.willBleedTop=willBleedTop=function(e,t){return assertArgument(isObject(e),1,"Object"),assertArgument(isObject(t),2,"Object"),e.top<0},exp.willBleedVertically=willBleedVertically=function(e,t){return assertArgument(isObject(e),1,"Object"),assertArgument(isObject(t),2,"Object"),t.top+e.height+t.bottom>getHeight()},exp.withdraw=withdraw=function(e,t){var r;return assertArgument(isObject(e),1,"Object"),assertArgument(isString(t,!0),2,"string"),has(e,t)&&(r=e[t],delete e[t]),r},exp.within=within=function(e,t,r){return assertArgument(isNumber(e),1,"number"),assertArgument(isNumber(t),2,"number"),assertArgument(isNumber(r),3,"number"),Math.max(Math.min(e,r),t)},exp.without=without=function(e,t){return assertArgument(e=toArray(e),1,"Arrayable"),_.without.apply(_,concat([e],slice(arguments,1)))},exp.words=words=function(e,t){return assertArgument(isVoid(e)||isString(e),1,"string"),assertArgument(isVoid(t)||isRegExp(t)||isString(t),2,"RegExp or string"),e?_.words(e,t):[]},exp.wrap=wrap=function(e,t){return assertArgument(isFunction(e),1,"Function"),assertArgument(isVoid(t)||isFunction(t),2,"Function"),_.wrap(e,t)},exp.xnor=xnor=function(e,t){return!xor(e,t)},exp.xor=xor=function(e,t){return Boolean(e)!==Boolean(t)},exp.zip=zip=function(e){return _.union.apply(_,map(filter(arguments,ary(isArrayable,1)),ary(toArray,1)))},exp.zipObject=zipObject=function(e,t){assertArgument(isString(e,!0)||isDefined(e=toArray(e)),1,"Arrayable or string");var r={},n=isArrayable(t);return isString(e)?r[e]=t:e.forEach(function(e,i){r[e]=n?t[i]:t}),r}}("undefined"!=typeof window?window:global,"undefined"!=typeof window);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},_dereq_("buffer").Buffer)

},{"buffer":6,"html-json-forms":2,"lodash":3,"url":14,"uuid":5}],2:[function(_dereq_,module,exports){
"use strict";function isNumeric(e){return/^\d+$/.test(e)}function parsePath(e){var t=e,n=[],r=!1,a=e.substr(0,e.indexOf("["));a.length?(e=e.substr(e.indexOf("["),e.length),n.push({key:a,last:!e.length,type:"object"})):r=!0;var u;for(u=e.substr(1,e.indexOf("]")-1);e.length&&!r;)"["===e[0]&&"]"===e[1]?(n.push({append:!0,type:"array"}),e=e.substr(2,e.length),r=0!==e.length):isNumeric(u=e.substr(1,e.indexOf("]")-1))?(u=parseInt(u,10),e=e.substr(e.indexOf("]")+1,e.length),n.push({key:u,type:"array"})):(u=e.substr(1,e.indexOf("]")-1))&&-1===u.indexOf("[")?(e=e.substr(e.indexOf("]")+1,e.length),n.push({key:u,type:"object"})):r=!0;if(r)n=[{key:t,last:!0,type:"object"}];else for(var o=0;o<n.length;o++){var l=n[o],c=n[o+1];c?l.nextType=c.type:l.last=!0}return n}function setValue(e,t,n,r,a){if(a&&(r={name:"filename",type:"filetype",body:"filebody"}),t.last){if("undefined"==typeof n)t.append?e.push(r):e[t.key]=r;else if(n.constructor==Array)e[t.key].push(r);else{if(n.constructor==Object&&!a)return setValue(n,{key:"",last:!0,type:"object"},n[""],r,a);e[t.key]=[n,r]}return e}if("undefined"==typeof n)return"array"===t.nextType?e[t.key]=[]:e[t.key]={},e[t.key];if(n.constructor===Object)return e[t.key];if(n.constructor===Array){if("array"===t.nextType)return n;var u={};return n.forEach(function(n,r){"undefined"!=typeof n?u[r]=n:e[t.key]=u}),u}var u={"":n};return e[t.key]=u,u}function JSONEncode(e){var t=collectEntries(e),n={};return t.forEach(function(e){for(var t=e.value&&void 0!==e.value.body,r=parsePath(e.name),a=n,u=0;u<r.length;u++){var o=r[u],l=a[o.key];a=setValue(a,o,l,e.value,t)}}),n}function collectEntries(e){return[].concat(Array.prototype.slice.call(e.querySelectorAll("input:not([type=submit])")).map(function(e){var t={name:e.name,value:e.value};switch(e.type){case"checkbox":t.value=e.checked;break;case"number":t.value=parseInt(e.value,10);break;case"radio":if(!e.checked)return null;t.value===e.value}return t})).concat(Array.prototype.slice.call(e.querySelectorAll("select:not([multiple])")).map(function(e){return{name:e.name,value:e.value}})).concat(Array.prototype.slice.call(e.querySelectorAll("select[multiple] option[selected]")).map(function(e){var t=parent(e,"select");return{name:t.name,value:e.value}})).concat(Array.prototype.slice.call(e.querySelectorAll("textarea")).map(function(e){return{name:e.name,value:e.value}})).filter(function(e){return e})}function parent(e,t){for(t=t.toLowerCase();e&&e.parentNode;)if(e=e.parentNode,e.tagName&&e.tagName.toLowerCase()==t)return e;return null}function JSONFormSubmitHandler(e){var t,n,r=e.target;"FORM"===r.tagName&&"application/json"===r.getAttribute("enctype")&&(e.preventDefault(),t=JSON.stringify(JSONEncode(r)),n=new XMLHttpRequest,n.open("POST",r.action),n.setRequestHeader("Content-Type","application/json; charset=utf-8"),n.send(t),n.onload=function(){n.status>200&&n.status<400?console.log("success :)"):console.log("failure :(")})}var Gn={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"};module.exports={enable:function(){addEventListener("submit",JSONFormSubmitHandler)},encode:JSONEncode,disable:function(){removeEventListener("submit",JSONFormSubmitHandler)}};
},{}],3:[function(_dereq_,module,exports){
(function (global){
(function(){function n(n,t){if(n!==t){var r=null===n,e=n===b,u=n===n,i=null===t,o=t===b,f=t===t;if(n>t&&!i||!u||r&&!o&&f||e&&f)return 1;if(t>n&&!r||!f||i&&!e&&u||o&&u)return-1}return 0}function t(n,t,r){for(var e=n.length,u=r?e:-1;r?u--:++u<e;)if(t(n[u],u,n))return u;return-1}function r(n,t,r){if(t!==t)return h(n,r);for(var e=r-1,u=n.length;++e<u;)if(n[e]===t)return e;return-1}function e(n){return"function"==typeof n||!1}function u(n){return null==n?"":n+""}function i(n,t){for(var r=-1,e=n.length;++r<e&&t.indexOf(n.charAt(r))>-1;);return r}function o(n,t){for(var r=n.length;r--&&t.indexOf(n.charAt(r))>-1;);return r}function f(t,r){return n(t.criteria,r.criteria)||t.index-r.index}function a(t,r,e){for(var u=-1,i=t.criteria,o=r.criteria,f=i.length,a=e.length;++u<f;){var c=n(i[u],o[u]);if(c){if(u>=a)return c;var l=e[u];return c*("asc"===l||l===!0?1:-1)}}return t.index-r.index}function c(n){return qn[n]}function l(n){return Mn[n]}function s(n,t,r){return t?n=Vn[n]:r&&(n=Yn[n]),"\\"+n}function p(n){return"\\"+Yn[n]}function h(n,t,r){for(var e=n.length,u=t+(r?0:-1);r?u--:++u<e;){var i=n[u];if(i!==i)return u}return-1}function v(n){return!!n&&"object"==typeof n}function _(n){return 160>=n&&n>=9&&13>=n||32==n||160==n||5760==n||6158==n||n>=8192&&(8202>=n||8232==n||8233==n||8239==n||8287==n||12288==n||65279==n)}function g(n,t){for(var r=-1,e=n.length,u=-1,i=[];++r<e;)n[r]===t&&(n[r]=D,i[++u]=r);return i}function y(n,t){for(var r,e=-1,u=n.length,i=-1,o=[];++e<u;){var f=n[e],a=t?t(f,e,n):f;e&&r===a||(r=a,o[++i]=f)}return o}function d(n){for(var t=-1,r=n.length;++t<r&&_(n.charCodeAt(t)););return t}function m(n){for(var t=n.length;t--&&_(n.charCodeAt(t)););return t}function w(n){return Pn[n]}function x(_){function G(n){if(v(n)&&!Cf(n)&&!(n instanceof qn)){if(n instanceof nn)return n;if(no.call(n,"__chain__")&&no.call(n,"__wrapped__"))return he(n)}return new nn(n)}function H(){}function nn(n,t,r){this.__wrapped__=n,this.__actions__=r||[],this.__chain__=!!t}function qn(n){this.__wrapped__=n,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=Oo,this.__views__=[]}function Mn(){var n=new qn(this.__wrapped__);return n.__actions__=et(this.__actions__),n.__dir__=this.__dir__,n.__filtered__=this.__filtered__,n.__iteratees__=et(this.__iteratees__),n.__takeCount__=this.__takeCount__,n.__views__=et(this.__views__),n}function Pn(){if(this.__filtered__){var n=new qn(this);n.__dir__=-1,n.__filtered__=!0}else n=this.clone(),n.__dir__*=-1;return n}function Kn(){var n=this.__wrapped__.value(),t=this.__dir__,r=Cf(n),e=0>t,u=r?n.length:0,i=Vr(0,u,this.__views__),o=i.start,f=i.end,a=f-o,c=e?f:o-1,l=this.__iteratees__,s=l.length,p=0,h=Ao(a,this.__takeCount__);if(!r||T>u||u==a&&h==a)return er(e&&r?n.reverse():n,this.__actions__);var v=[];n:for(;a--&&h>p;){c+=t;for(var _=-1,g=n[c];++_<s;){var y=l[_],d=y.iteratee,m=y.type,w=d(g);if(m==B)g=w;else if(!w){if(m==L)continue n;break n}}v[p++]=g}return v}function Vn(){this.__data__={}}function Yn(n){return this.has(n)&&delete this.__data__[n]}function Gn(n){return"__proto__"==n?b:this.__data__[n]}function Jn(n){return"__proto__"!=n&&no.call(this.__data__,n)}function Xn(n,t){return"__proto__"!=n&&(this.__data__[n]=t),this}function Zn(n){var t=n?n.length:0;for(this.data={hash:go(null),set:new lo};t--;)this.push(n[t])}function Hn(n,t){var r=n.data,e="string"==typeof t||Wu(t)?r.set.has(t):r.hash[t];return e?0:-1}function Qn(n){var t=this.data;"string"==typeof n||Wu(n)?t.set.add(n):t.hash[n]=!0}function rt(n,t){for(var r=-1,e=n.length,u=-1,i=t.length,o=zi(e+i);++r<e;)o[r]=n[r];for(;++u<i;)o[r++]=t[u];return o}function et(n,t){var r=-1,e=n.length;for(t||(t=zi(e));++r<e;)t[r]=n[r];return t}function ut(n,t){for(var r=-1,e=n.length;++r<e&&t(n[r],r,n)!==!1;);return n}function it(n,t){for(var r=n.length;r--&&t(n[r],r,n)!==!1;);return n}function ot(n,t){for(var r=-1,e=n.length;++r<e;)if(!t(n[r],r,n))return!1;return!0}function ft(n,t,r,e){for(var u=-1,i=n.length,o=e,f=o;++u<i;){var a=n[u],c=+t(a);r(c,o)&&(o=c,f=a)}return f}function at(n,t){for(var r=-1,e=n.length,u=-1,i=[];++r<e;){var o=n[r];t(o,r,n)&&(i[++u]=o)}return i}function ct(n,t){for(var r=-1,e=n.length,u=zi(e);++r<e;)u[r]=t(n[r],r,n);return u}function lt(n,t){for(var r=-1,e=t.length,u=n.length;++r<e;)n[u+r]=t[r];return n}function st(n,t,r,e){var u=-1,i=n.length;for(e&&i&&(r=n[++u]);++u<i;)r=t(r,n[u],u,n);return r}function pt(n,t,r,e){var u=n.length;for(e&&u&&(r=n[--u]);u--;)r=t(r,n[u],u,n);return r}function ht(n,t){for(var r=-1,e=n.length;++r<e;)if(t(n[r],r,n))return!0;return!1}function vt(n,t){for(var r=n.length,e=0;r--;)e+=+t(n[r])||0;return e}function _t(n,t){return n===b?t:n}function gt(n,t,r,e){return n!==b&&no.call(e,r)?n:t}function yt(n,t,r){for(var e=-1,u=Df(t),i=u.length;++e<i;){var o=u[e],f=n[o],a=r(f,t[o],o,n,t);(a===a?a===f:f!==f)&&(f!==b||o in n)||(n[o]=a)}return n}function dt(n,t){return null==t?n:wt(t,Df(t),n)}function mt(n,t){for(var r=-1,e=null==n,u=!e&&Zr(n),i=u?n.length:0,o=t.length,f=zi(o);++r<o;){var a=t[r];u?f[r]=Hr(a,i)?n[a]:b:f[r]=e?b:n[a]}return f}function wt(n,t,r){r||(r={});for(var e=-1,u=t.length;++e<u;){var i=t[e];r[i]=n[i]}return r}function xt(n,t,r){var e=typeof n;return"function"==e?t===b?n:or(n,t,r):null==n?Ri:"object"==e?zt(n):t===b?Si(n):Dt(n,t)}function bt(n,t,r,e,u,i,o){var f;if(r&&(f=u?r(n,e,u):r(n)),f!==b)return f;if(!Wu(n))return n;var a=Cf(n);if(a){if(f=Yr(n),!t)return et(n,f)}else{var c=ro.call(n),l=c==Y;if(c!=X&&c!=q&&(!l||u))return Dn[c]?Jr(n,c,t):u?n:{};if(f=Gr(l?{}:n),!t)return dt(f,n)}i||(i=[]),o||(o=[]);for(var s=i.length;s--;)if(i[s]==n)return o[s];return i.push(n),o.push(f),(a?ut:$t)(n,function(e,u){f[u]=bt(e,t,r,u,n,i,o)}),f}function At(n,t,r){if("function"!=typeof n)throw new Ji(z);return so(function(){n.apply(b,r)},t)}function jt(n,t){var e=n?n.length:0,u=[];if(!e)return u;var i=-1,o=Mr(),f=o==r,a=f&&t.length>=T?_r(t):null,c=t.length;a&&(o=Hn,f=!1,t=a);n:for(;++i<e;){var l=n[i];if(f&&l===l){for(var s=c;s--;)if(t[s]===l)continue n;u.push(l)}else o(t,l,0)<0&&u.push(l)}return u}function kt(n,t){var r=!0;return No(n,function(n,e,u){return r=!!t(n,e,u)}),r}function It(n,t,r,e){var u=e,i=u;return No(n,function(n,o,f){var a=+t(n,o,f);(r(a,u)||a===e&&a===i)&&(u=a,i=n)}),i}function Rt(n,t,r,e){var u=n.length;for(r=null==r?0:+r||0,0>r&&(r=-r>u?0:u+r),e=e===b||e>u?u:+e||0,0>e&&(e+=u),u=r>e?0:e>>>0,r>>>=0;u>r;)n[r++]=t;return n}function Ot(n,t){var r=[];return No(n,function(n,e,u){t(n,e,u)&&r.push(n)}),r}function Et(n,t,r,e){var u;return r(n,function(n,r,i){return t(n,r,i)?(u=e?r:n,!1):void 0}),u}function Ct(n,t,r,e){e||(e=[]);for(var u=-1,i=n.length;++u<i;){var o=n[u];v(o)&&Zr(o)&&(r||Cf(o)||ku(o))?t?Ct(o,t,r,e):lt(e,o):r||(e[e.length]=o)}return e}function Ut(n,t){return Lo(n,t,ni)}function $t(n,t){return Lo(n,t,Df)}function St(n,t){return Bo(n,t,Df)}function Wt(n,t){for(var r=-1,e=t.length,u=-1,i=[];++r<e;){var o=t[r];Su(n[o])&&(i[++u]=o)}return i}function Ft(n,t,r){if(null!=n){r!==b&&r in se(n)&&(t=[r]);for(var e=0,u=t.length;null!=n&&u>e;)n=n[t[e++]];return e&&e==u?n:b}}function Nt(n,t,r,e,u,i){return n===t?!0:null==n||null==t||!Wu(n)&&!v(t)?n!==n&&t!==t:Tt(n,t,Nt,r,e,u,i)}function Tt(n,t,r,e,u,i,o){var f=Cf(n),a=Cf(t),c=M,l=M;f||(c=ro.call(n),c==q?c=X:c!=X&&(f=Mu(n))),a||(l=ro.call(t),l==q?l=X:l!=X&&(a=Mu(t)));var s=c==X,p=l==X,h=c==l;if(h&&!f&&!s)return Br(n,t,c);if(!u){var v=s&&no.call(n,"__wrapped__"),_=p&&no.call(t,"__wrapped__");if(v||_)return r(v?n.value():n,_?t.value():t,e,u,i,o)}if(!h)return!1;i||(i=[]),o||(o=[]);for(var g=i.length;g--;)if(i[g]==n)return o[g]==t;i.push(n),o.push(t);var y=(f?Lr:zr)(n,t,r,e,u,i,o);return i.pop(),o.pop(),y}function Lt(n,t,r){var e=t.length,u=e,i=!r;if(null==n)return!u;for(n=se(n);e--;){var o=t[e];if(i&&o[2]?o[1]!==n[o[0]]:!(o[0]in n))return!1}for(;++e<u;){o=t[e];var f=o[0],a=n[f],c=o[1];if(i&&o[2]){if(a===b&&!(f in n))return!1}else{var l=r?r(a,c,f):b;if(!(l===b?Nt(c,a,r,!0):l))return!1}}return!0}function Bt(n,t){var r=-1,e=Zr(n)?zi(n.length):[];return No(n,function(n,u,i){e[++r]=t(n,u,i)}),e}function zt(n){var t=Pr(n);if(1==t.length&&t[0][2]){var r=t[0][0],e=t[0][1];return function(n){return null==n?!1:n[r]===e&&(e!==b||r in se(n))}}return function(n){return Lt(n,t)}}function Dt(n,t){var r=Cf(n),e=ne(n)&&ee(t),u=n+"";return n=pe(n),function(i){if(null==i)return!1;var o=u;if(i=se(i),(r||!e)&&!(o in i)){if(i=1==n.length?i:Ft(i,Jt(n,0,-1)),null==i)return!1;o=Ie(n),i=se(i)}return i[o]===t?t!==b||o in i:Nt(t,i[o],b,!0)}}function qt(n,t,r,e,u){if(!Wu(n))return n;var i=Zr(t)&&(Cf(t)||Mu(t)),o=i?b:Df(t);return ut(o||t,function(f,a){if(o&&(a=f,f=t[a]),v(f))e||(e=[]),u||(u=[]),Mt(n,t,a,qt,r,e,u);else{var c=n[a],l=r?r(c,f,a,n,t):b,s=l===b;s&&(l=f),l===b&&(!i||a in n)||!s&&(l===l?l===c:c!==c)||(n[a]=l)}}),n}function Mt(n,t,r,e,u,i,o){for(var f=i.length,a=t[r];f--;)if(i[f]==a)return void(n[r]=o[f]);var c=n[r],l=u?u(c,a,r,n,t):b,s=l===b;s&&(l=a,Zr(a)&&(Cf(a)||Mu(a))?l=Cf(c)?c:Zr(c)?et(c):[]:zu(a)||ku(a)?l=ku(c)?Gu(c):zu(c)?c:{}:s=!1),i.push(a),o.push(l),s?n[r]=e(l,a,u,i,o):(l===l?l!==c:c===c)&&(n[r]=l)}function Pt(n){return function(t){return null==t?b:t[n]}}function Kt(n){var t=n+"";return n=pe(n),function(r){return Ft(r,n,t)}}function Vt(n,t){for(var r=n?t.length:0;r--;){var e=t[r];if(e!=u&&Hr(e)){var u=e;po.call(n,e,1)}}return n}function Yt(n,t){return n+yo(Io()*(t-n+1))}function Gt(n,t,r,e,u){return u(n,function(n,u,i){r=e?(e=!1,n):t(r,n,u,i)}),r}function Jt(n,t,r){var e=-1,u=n.length;t=null==t?0:+t||0,0>t&&(t=-t>u?0:u+t),r=r===b||r>u?u:+r||0,0>r&&(r+=u),u=t>r?0:r-t>>>0,t>>>=0;for(var i=zi(u);++e<u;)i[e]=n[e+t];return i}function Xt(n,t){var r;return No(n,function(n,e,u){return r=t(n,e,u),!r}),!!r}function Zt(n,t){var r=n.length;for(n.sort(t);r--;)n[r]=n[r].value;return n}function Ht(n,t,r){var e=Dr(),u=-1;t=ct(t,function(n){return e(n)});var i=Bt(n,function(n){var r=ct(t,function(t){return t(n)});return{criteria:r,index:++u,value:n}});return Zt(i,function(n,t){return a(n,t,r)})}function Qt(n,t){var r=0;return No(n,function(n,e,u){r+=+t(n,e,u)||0}),r}function nr(n,t){var e=-1,u=Mr(),i=n.length,o=u==r,f=o&&i>=T,a=f?_r():null,c=[];a?(u=Hn,o=!1):(f=!1,a=t?[]:c);n:for(;++e<i;){var l=n[e],s=t?t(l,e,n):l;if(o&&l===l){for(var p=a.length;p--;)if(a[p]===s)continue n;t&&a.push(s),c.push(l)}else u(a,s,0)<0&&((t||f)&&a.push(s),c.push(l))}return c}function tr(n,t){for(var r=-1,e=t.length,u=zi(e);++r<e;)u[r]=n[t[r]];return u}function rr(n,t,r,e){for(var u=n.length,i=e?u:-1;(e?i--:++i<u)&&t(n[i],i,n););return r?Jt(n,e?0:i,e?i+1:u):Jt(n,e?i+1:0,e?u:i)}function er(n,t){var r=n;r instanceof qn&&(r=r.value());for(var e=-1,u=t.length;++e<u;){var i=t[e];r=i.func.apply(i.thisArg,lt([r],i.args))}return r}function ur(n,t,r){var e=0,u=n?n.length:e;if("number"==typeof t&&t===t&&Uo>=u){for(;u>e;){var i=e+u>>>1,o=n[i];(r?t>=o:t>o)&&null!==o?e=i+1:u=i}return u}return ir(n,t,Ri,r)}function ir(n,t,r,e){t=r(t);for(var u=0,i=n?n.length:0,o=t!==t,f=null===t,a=t===b;i>u;){var c=yo((u+i)/2),l=r(n[c]),s=l!==b,p=l===l;if(o)var h=p||e;else h=f?p&&s&&(e||null!=l):a?p&&(e||s):null==l?!1:e?t>=l:t>l;h?u=c+1:i=c}return Ao(i,Co)}function or(n,t,r){if("function"!=typeof n)return Ri;if(t===b)return n;switch(r){case 1:return function(r){return n.call(t,r)};case 3:return function(r,e,u){return n.call(t,r,e,u)};case 4:return function(r,e,u,i){return n.call(t,r,e,u,i)};case 5:return function(r,e,u,i,o){return n.call(t,r,e,u,i,o)}}return function(){return n.apply(t,arguments)}}function fr(n){var t=new io(n.byteLength),r=new ho(t);return r.set(new ho(n)),t}function ar(n,t,r){for(var e=r.length,u=-1,i=bo(n.length-e,0),o=-1,f=t.length,a=zi(f+i);++o<f;)a[o]=t[o];for(;++u<e;)a[r[u]]=n[u];for(;i--;)a[o++]=n[u++];return a}function cr(n,t,r){for(var e=-1,u=r.length,i=-1,o=bo(n.length-u,0),f=-1,a=t.length,c=zi(o+a);++i<o;)c[i]=n[i];for(var l=i;++f<a;)c[l+f]=t[f];for(;++e<u;)c[l+r[e]]=n[i++];return c}function lr(n,t){return function(r,e,u){var i=t?t():{};if(e=Dr(e,u,3),Cf(r))for(var o=-1,f=r.length;++o<f;){var a=r[o];n(i,a,e(a,o,r),r)}else No(r,function(t,r,u){n(i,t,e(t,r,u),u)});return i}}function sr(n){return yu(function(t,r){var e=-1,u=null==t?0:r.length,i=u>2?r[u-2]:b,o=u>2?r[2]:b,f=u>1?r[u-1]:b;for("function"==typeof i?(i=or(i,f,5),u-=2):(i="function"==typeof f?f:b,u-=i?1:0),o&&Qr(r[0],r[1],o)&&(i=3>u?b:i,u=1);++e<u;){var a=r[e];a&&n(t,a,i)}return t})}function pr(n,t){return function(r,e){var u=r?qo(r):0;if(!re(u))return n(r,e);for(var i=t?u:-1,o=se(r);(t?i--:++i<u)&&e(o[i],i,o)!==!1;);return r}}function hr(n){return function(t,r,e){for(var u=se(t),i=e(t),o=i.length,f=n?o:-1;n?f--:++f<o;){var a=i[f];if(r(u[a],a,u)===!1)break}return t}}function vr(n,t){function r(){var u=this&&this!==nt&&this instanceof r?e:n;return u.apply(t,arguments)}var e=yr(n);return r}function _r(n){return go&&lo?new Zn(n):null}function gr(n){return function(t){for(var r=-1,e=ji(li(t)),u=e.length,i="";++r<u;)i=n(i,e[r],r);return i}}function yr(n){return function(){var t=arguments;switch(t.length){case 0:return new n;case 1:return new n(t[0]);case 2:return new n(t[0],t[1]);case 3:return new n(t[0],t[1],t[2]);case 4:return new n(t[0],t[1],t[2],t[3]);case 5:return new n(t[0],t[1],t[2],t[3],t[4]);case 6:return new n(t[0],t[1],t[2],t[3],t[4],t[5]);case 7:return new n(t[0],t[1],t[2],t[3],t[4],t[5],t[6])}var r=Fo(n.prototype),e=n.apply(r,t);return Wu(e)?e:r}}function dr(n){function t(r,e,u){u&&Qr(r,e,u)&&(e=b);var i=Tr(r,n,b,b,b,b,b,e);return i.placeholder=t.placeholder,i}return t}function mr(n,t){return yu(function(r){var e=r[0];return null==e?e:(r.push(t),n.apply(b,r))})}function wr(n,t){return function(r,e,u){if(u&&Qr(r,e,u)&&(e=b),e=Dr(e,u,3),1==e.length){r=Cf(r)?r:le(r);var i=ft(r,e,n,t);if(!r.length||i!==t)return i}return It(r,e,n,t)}}function xr(n,r){return function(e,u,i){if(u=Dr(u,i,3),Cf(e)){var o=t(e,u,r);return o>-1?e[o]:b}return Et(e,u,n)}}function br(n){return function(r,e,u){return r&&r.length?(e=Dr(e,u,3),t(r,e,n)):-1}}function Ar(n){return function(t,r,e){return r=Dr(r,e,3),Et(t,r,n,!0)}}function jr(n){return function(){for(var t,r=arguments.length,e=n?r:-1,u=0,i=zi(r);n?e--:++e<r;){var o=i[u++]=arguments[e];if("function"!=typeof o)throw new Ji(z);!t&&nn.prototype.thru&&"wrapper"==qr(o)&&(t=new nn([],!0))}for(e=t?-1:r;++e<r;){o=i[e];var f=qr(o),a="wrapper"==f?Do(o):b;t=a&&te(a[0])&&a[1]==(U|R|E|$)&&!a[4].length&&1==a[9]?t[qr(a[0])].apply(t,a[3]):1==o.length&&te(o)?t[f]():t.thru(o)}return function(){var n=arguments,e=n[0];if(t&&1==n.length&&Cf(e)&&e.length>=T)return t.plant(e).value();for(var u=0,o=r?i[u].apply(this,n):e;++u<r;)o=i[u].call(this,o);return o}}}function kr(n,t){return function(r,e,u){return"function"==typeof e&&u===b&&Cf(r)?n(r,e):t(r,or(e,u,3))}}function Ir(n){return function(t,r,e){return("function"!=typeof r||e!==b)&&(r=or(r,e,3)),n(t,r,ni)}}function Rr(n){return function(t,r,e){return("function"!=typeof r||e!==b)&&(r=or(r,e,3)),n(t,r)}}function Or(n){return function(t,r,e){var u={};return r=Dr(r,e,3),$t(t,function(t,e,i){var o=r(t,e,i);e=n?o:e,t=n?t:o,u[e]=t}),u}}function Er(n){return function(t,r,e){return t=u(t),(n?t:"")+Sr(t,r,e)+(n?"":t)}}function Cr(n){var t=yu(function(r,e){var u=g(e,t.placeholder);return Tr(r,n,b,e,u)});return t}function Ur(n,t){return function(r,e,u,i){var o=arguments.length<3;return"function"==typeof e&&i===b&&Cf(r)?n(r,e,u,o):Gt(r,Dr(e,i,4),u,o,t)}}function $r(n,t,r,e,u,i,o,f,a,c){function l(){for(var m=arguments.length,w=m,x=zi(m);w--;)x[w]=arguments[w];if(e&&(x=ar(x,e,u)),i&&(x=cr(x,i,o)),v||y){var A=l.placeholder,I=g(x,A);if(m-=I.length,c>m){var R=f?et(f):b,O=bo(c-m,0),U=v?I:b,$=v?b:I,S=v?x:b,W=v?b:x;t|=v?E:C,t&=~(v?C:E),_||(t&=~(j|k));var F=[n,t,r,S,U,W,$,R,a,O],N=$r.apply(b,F);return te(n)&&Mo(N,F),N.placeholder=A,N}}var T=p?r:this,L=h?T[n]:n;return f&&(x=ae(x,f)),s&&a<x.length&&(x.length=a),this&&this!==nt&&this instanceof l&&(L=d||yr(n)),L.apply(T,x)}var s=t&U,p=t&j,h=t&k,v=t&R,_=t&I,y=t&O,d=h?b:yr(n);return l}function Sr(n,t,r){var e=n.length;if(t=+t,e>=t||!wo(t))return"";var u=t-e;return r=null==r?" ":r+"",gi(r,_o(u/r.length)).slice(0,u)}function Wr(n,t,r,e){function u(){for(var t=-1,f=arguments.length,a=-1,c=e.length,l=zi(c+f);++a<c;)l[a]=e[a];for(;f--;)l[a++]=arguments[++t];var s=this&&this!==nt&&this instanceof u?o:n;return s.apply(i?r:this,l)}var i=t&j,o=yr(n);return u}function Fr(n){var t=Pi[n];return function(n,r){return r=r===b?0:+r||0,r?(r=ao(10,r),t(n*r)/r):t(n)}}function Nr(n){return function(t,r,e,u){var i=Dr(e);return null==e&&i===xt?ur(t,r,n):ir(t,r,i(e,u,1),n)}}function Tr(n,t,r,e,u,i,o,f){var a=t&k;if(!a&&"function"!=typeof n)throw new Ji(z);var c=e?e.length:0;if(c||(t&=~(E|C),e=u=b),c-=u?u.length:0,t&C){var l=e,s=u;e=u=b}var p=a?b:Do(n),h=[n,t,r,e,u,l,s,i,o,f];if(p&&(ue(h,p),t=h[1],f=h[9]),h[9]=null==f?a?0:n.length:bo(f-c,0)||0,t==j)var v=vr(h[0],h[2]);else v=t!=E&&t!=(j|E)||h[4].length?$r.apply(b,h):Wr.apply(b,h);var _=p?zo:Mo;return _(v,h)}function Lr(n,t,r,e,u,i,o){var f=-1,a=n.length,c=t.length;if(a!=c&&!(u&&c>a))return!1;for(;++f<a;){var l=n[f],s=t[f],p=e?e(u?s:l,u?l:s,f):b;if(p!==b){if(p)continue;return!1}if(u){if(!ht(t,function(n){return l===n||r(l,n,e,u,i,o)}))return!1}else if(l!==s&&!r(l,s,e,u,i,o))return!1}return!0}function Br(n,t,r){switch(r){case P:case K:return+n==+t;case V:return n.name==t.name&&n.message==t.message;case J:return n!=+n?t!=+t:n==+t;case Z:case Q:return n==t+""}return!1}function zr(n,t,r,e,u,i,o){var f=Df(n),a=f.length,c=Df(t),l=c.length;if(a!=l&&!u)return!1;for(var s=a;s--;){var p=f[s];if(!(u?p in t:no.call(t,p)))return!1}for(var h=u;++s<a;){p=f[s];var v=n[p],_=t[p],g=e?e(u?_:v,u?v:_,p):b;if(!(g===b?r(v,_,e,u,i,o):g))return!1;h||(h="constructor"==p)}if(!h){var y=n.constructor,d=t.constructor;if(y!=d&&"constructor"in n&&"constructor"in t&&!("function"==typeof y&&y instanceof y&&"function"==typeof d&&d instanceof d))return!1}return!0}function Dr(n,t,r){var e=G.callback||ki;return e=e===ki?xt:e,r?e(n,t,r):e}function qr(n){for(var t=n.name,r=Wo[t],e=r?r.length:0;e--;){var u=r[e],i=u.func;if(null==i||i==n)return u.name}return t}function Mr(n,t,e){var u=G.indexOf||je;return u=u===je?r:u,n?u(n,t,e):u}function Pr(n){for(var t=ti(n),r=t.length;r--;)t[r][2]=ee(t[r][1]);return t}function Kr(n,t){var r=null==n?b:n[t];return Tu(r)?r:b}function Vr(n,t,r){for(var e=-1,u=r.length;++e<u;){var i=r[e],o=i.size;switch(i.type){case"drop":n+=o;break;case"dropRight":t-=o;break;case"take":t=Ao(t,n+o);break;case"takeRight":n=bo(n,t-o)}}return{start:n,end:t}}function Yr(n){var t=n.length,r=new n.constructor(t);return t&&"string"==typeof n[0]&&no.call(n,"index")&&(r.index=n.index,r.input=n.input),r}function Gr(n){var t=n.constructor;return"function"==typeof t&&t instanceof t||(t=Vi),new t}function Jr(n,t,r){var e=n.constructor;switch(t){case tn:return fr(n);case P:case K:return new e(+n);case rn:case en:case un:case on:case fn:case an:case cn:case ln:case sn:var u=n.buffer;return new e(r?fr(u):u,n.byteOffset,n.length);case J:case Q:return new e(n);case Z:var i=new e(n.source,Cn.exec(n));i.lastIndex=n.lastIndex}return i}function Xr(n,t,r){null==n||ne(t,n)||(t=pe(t),n=1==t.length?n:Ft(n,Jt(t,0,-1)),t=Ie(t));var e=null==n?n:n[t];return null==e?b:e.apply(n,r)}function Zr(n){return null!=n&&re(qo(n))}function Hr(n,t){return n="number"==typeof n||Sn.test(n)?+n:-1,t=null==t?$o:t,n>-1&&n%1==0&&t>n}function Qr(n,t,r){if(!Wu(r))return!1;var e=typeof t;if("number"==e?Zr(r)&&Hr(t,r.length):"string"==e&&t in r){var u=r[t];return n===n?n===u:u!==u}return!1}function ne(n,t){var r=typeof n;if("string"==r&&An.test(n)||"number"==r)return!0;if(Cf(n))return!1;var e=!bn.test(n);return e||null!=t&&n in se(t)}function te(n){var t=qr(n);if(!(t in qn.prototype))return!1;var r=G[t];if(n===r)return!0;var e=Do(r);return!!e&&n===e[0]}function re(n){return"number"==typeof n&&n>-1&&n%1==0&&$o>=n}function ee(n){return n===n&&!Wu(n)}function ue(n,t){var r=n[1],e=t[1],u=r|e,i=U>u,o=e==U&&r==R||e==U&&r==$&&n[7].length<=t[8]||e==(U|$)&&r==R;if(!i&&!o)return n;e&j&&(n[2]=t[2],u|=r&j?0:I);var f=t[3];if(f){var a=n[3];n[3]=a?ar(a,f,t[4]):et(f),n[4]=a?g(n[3],D):et(t[4])}return f=t[5],f&&(a=n[5],n[5]=a?cr(a,f,t[6]):et(f),n[6]=a?g(n[5],D):et(t[6])),f=t[7],f&&(n[7]=et(f)),e&U&&(n[8]=null==n[8]?t[8]:Ao(n[8],t[8])),null==n[9]&&(n[9]=t[9]),n[0]=t[0],n[1]=u,n}function ie(n,t){return n===b?t:Uf(n,t,ie)}function oe(n,t){n=se(n);for(var r=-1,e=t.length,u={};++r<e;){var i=t[r];i in n&&(u[i]=n[i])}return u}function fe(n,t){var r={};return Ut(n,function(n,e,u){t(n,e,u)&&(r[e]=n)}),r}function ae(n,t){for(var r=n.length,e=Ao(t.length,r),u=et(n);e--;){var i=t[e];n[e]=Hr(i,r)?u[i]:b}return n}function ce(n){for(var t=ni(n),r=t.length,e=r&&n.length,u=!!e&&re(e)&&(Cf(n)||ku(n)),i=-1,o=[];++i<r;){var f=t[i];(u&&Hr(f,e)||no.call(n,f))&&o.push(f)}return o}function le(n){return null==n?[]:Zr(n)?Wu(n)?n:Vi(n):ii(n)}function se(n){return Wu(n)?n:Vi(n)}function pe(n){if(Cf(n))return n;var t=[];return u(n).replace(jn,function(n,r,e,u){t.push(e?u.replace(On,"$1"):r||n)}),t}function he(n){return n instanceof qn?n.clone():new nn(n.__wrapped__,n.__chain__,et(n.__actions__))}function ve(n,t,r){t=(r?Qr(n,t,r):null==t)?1:bo(yo(t)||1,1);for(var e=0,u=n?n.length:0,i=-1,o=zi(_o(u/t));u>e;)o[++i]=Jt(n,e,e+=t);return o}function _e(n){for(var t=-1,r=n?n.length:0,e=-1,u=[];++t<r;){var i=n[t];i&&(u[++e]=i)}return u}function ge(n,t,r){var e=n?n.length:0;return e?((r?Qr(n,t,r):null==t)&&(t=1),Jt(n,0>t?0:t)):[]}function ye(n,t,r){var e=n?n.length:0;return e?((r?Qr(n,t,r):null==t)&&(t=1),t=e-(+t||0),Jt(n,0,0>t?0:t)):[]}function de(n,t,r){return n&&n.length?rr(n,Dr(t,r,3),!0,!0):[]}function me(n,t,r){return n&&n.length?rr(n,Dr(t,r,3),!0):[]}function we(n,t,r,e){var u=n?n.length:0;return u?(r&&"number"!=typeof r&&Qr(n,t,r)&&(r=0,e=u),Rt(n,t,r,e)):[]}function xe(n){return n?n[0]:b}function be(n,t,r){var e=n?n.length:0;return r&&Qr(n,t,r)&&(t=!1),e?Ct(n,t):[]}function Ae(n){var t=n?n.length:0;return t?Ct(n,!0):[]}function je(n,t,e){var u=n?n.length:0;if(!u)return-1;if("number"==typeof e)e=0>e?bo(u+e,0):e;else if(e){var i=ur(n,t);return u>i&&(t===t?t===n[i]:n[i]!==n[i])?i:-1}return r(n,t,e||0)}function ke(n){return ye(n,1)}function Ie(n){var t=n?n.length:0;return t?n[t-1]:b}function Re(n,t,r){var e=n?n.length:0;if(!e)return-1;var u=e;if("number"==typeof r)u=(0>r?bo(e+r,0):Ao(r||0,e-1))+1;else if(r){u=ur(n,t,!0)-1;var i=n[u];return(t===t?t===i:i!==i)?u:-1}if(t!==t)return h(n,u,!0);for(;u--;)if(n[u]===t)return u;return-1}function Oe(){var n=arguments,t=n[0];if(!t||!t.length)return t;for(var r=0,e=Mr(),u=n.length;++r<u;)for(var i=0,o=n[r];(i=e(t,o,i))>-1;)po.call(t,i,1);return t}function Ee(n,t,r){var e=[];if(!n||!n.length)return e;var u=-1,i=[],o=n.length;for(t=Dr(t,r,3);++u<o;){var f=n[u];t(f,u,n)&&(e.push(f),i.push(u))}return Vt(n,i),e}function Ce(n){return ge(n,1)}function Ue(n,t,r){var e=n?n.length:0;return e?(r&&"number"!=typeof r&&Qr(n,t,r)&&(t=0,r=e),Jt(n,t,r)):[]}function $e(n,t,r){var e=n?n.length:0;return e?((r?Qr(n,t,r):null==t)&&(t=1),Jt(n,0,0>t?0:t)):[]}function Se(n,t,r){var e=n?n.length:0;return e?((r?Qr(n,t,r):null==t)&&(t=1),t=e-(+t||0),Jt(n,0>t?0:t)):[]}function We(n,t,r){return n&&n.length?rr(n,Dr(t,r,3),!1,!0):[]}function Fe(n,t,r){return n&&n.length?rr(n,Dr(t,r,3)):[]}function Ne(n,t,e,u){var i=n?n.length:0;if(!i)return[];null!=t&&"boolean"!=typeof t&&(u=e,e=Qr(n,t,u)?b:t,t=!1);var o=Dr();return(null!=e||o!==xt)&&(e=o(e,u,3)),t&&Mr()==r?y(n,e):nr(n,e)}function Te(n){if(!n||!n.length)return[];var t=-1,r=0;n=at(n,function(n){return Zr(n)?(r=bo(n.length,r),!0):void 0});for(var e=zi(r);++t<r;)e[t]=ct(n,Pt(t));return e}function Le(n,t,r){var e=n?n.length:0;if(!e)return[];var u=Te(n);return null==t?u:(t=or(t,r,4),ct(u,function(n){return st(n,t,b,!0)}))}function Be(){for(var n=-1,t=arguments.length;++n<t;){var r=arguments[n];if(Zr(r))var e=e?lt(jt(e,r),jt(r,e)):r}return e?nr(e):[]}function ze(n,t){var r=-1,e=n?n.length:0,u={};for(!e||t||Cf(n[0])||(t=[]);++r<e;){var i=n[r];t?u[i]=t[r]:i&&(u[i[0]]=i[1])}return u}function De(n){var t=G(n);return t.__chain__=!0,t}function qe(n,t,r){return t.call(r,n),n}function Me(n,t,r){return t.call(r,n)}function Pe(){return De(this)}function Ke(){return new nn(this.value(),this.__chain__)}function Ve(n){for(var t,r=this;r instanceof H;){var e=he(r);t?u.__wrapped__=e:t=e;var u=e;r=r.__wrapped__}return u.__wrapped__=n,t}function Ye(){var n=this.__wrapped__,t=function(n){return r&&r.__dir__<0?n:n.reverse()};if(n instanceof qn){var r=n;return this.__actions__.length&&(r=new qn(this)),r=r.reverse(),r.__actions__.push({func:Me,args:[t],thisArg:b}),new nn(r,this.__chain__)}return this.thru(t)}function Ge(){return this.value()+""}function Je(){return er(this.__wrapped__,this.__actions__)}function Xe(n,t,r){var e=Cf(n)?ot:kt;return r&&Qr(n,t,r)&&(t=b),("function"!=typeof t||r!==b)&&(t=Dr(t,r,3)),e(n,t)}function Ze(n,t,r){var e=Cf(n)?at:Ot;return t=Dr(t,r,3),e(n,t)}function He(n,t){return uf(n,zt(t))}function Qe(n,t,r,e){var u=n?qo(n):0;return re(u)||(n=ii(n),u=n.length),r="number"!=typeof r||e&&Qr(t,r,e)?0:0>r?bo(u+r,0):r||0,"string"==typeof n||!Cf(n)&&qu(n)?u>=r&&n.indexOf(t,r)>-1:!!u&&Mr(n,t,r)>-1}function nu(n,t,r){var e=Cf(n)?ct:Bt;return t=Dr(t,r,3),e(n,t)}function tu(n,t){return nu(n,Si(t))}function ru(n,t,r){var e=Cf(n)?at:Ot;return t=Dr(t,r,3),e(n,function(n,r,e){return!t(n,r,e)})}function eu(n,t,r){if(r?Qr(n,t,r):null==t){n=le(n);var e=n.length;return e>0?n[Yt(0,e-1)]:b}var u=-1,i=Yu(n),e=i.length,o=e-1;for(t=Ao(0>t?0:+t||0,e);++u<t;){var f=Yt(u,o),a=i[f];i[f]=i[u],i[u]=a}return i.length=t,i}function uu(n){return eu(n,Oo)}function iu(n){var t=n?qo(n):0;return re(t)?t:Df(n).length}function ou(n,t,r){var e=Cf(n)?ht:Xt;return r&&Qr(n,t,r)&&(t=b),("function"!=typeof t||r!==b)&&(t=Dr(t,r,3)),e(n,t)}function fu(n,t,r){if(null==n)return[];r&&Qr(n,t,r)&&(t=b);var e=-1;t=Dr(t,r,3);var u=Bt(n,function(n,r,u){return{criteria:t(n,r,u),index:++e,value:n}});return Zt(u,f)}function au(n,t,r,e){return null==n?[]:(e&&Qr(t,r,e)&&(r=b),Cf(t)||(t=null==t?[]:[t]),Cf(r)||(r=null==r?[]:[r]),Ht(n,t,r))}function cu(n,t){return Ze(n,zt(t))}function lu(n,t){if("function"!=typeof t){if("function"!=typeof n)throw new Ji(z);var r=n;n=t,t=r}return n=wo(n=+n)?n:0,function(){return--n<1?t.apply(this,arguments):void 0}}function su(n,t,r){return r&&Qr(n,t,r)&&(t=b),t=n&&null==t?n.length:bo(+t||0,0),Tr(n,U,b,b,b,b,t)}function pu(n,t){var r;if("function"!=typeof t){if("function"!=typeof n)throw new Ji(z);var e=n;n=t,t=e}return function(){return--n>0&&(r=t.apply(this,arguments)),1>=n&&(t=b),r}}function hu(n,t,r){function e(){h&&oo(h),c&&oo(c),_=0,c=h=v=b}function u(t,r){r&&oo(r),c=h=v=b,t&&(_=gf(),l=n.apply(p,a),h||c||(a=p=b))}function i(){var n=t-(gf()-s);0>=n||n>t?u(v,c):h=so(i,n)}function o(){u(y,h)}function f(){if(a=arguments,s=gf(),p=this,v=y&&(h||!d),g===!1)var r=d&&!h;else{c||d||(_=s);var e=g-(s-_),u=0>=e||e>g;u?(c&&(c=oo(c)),_=s,l=n.apply(p,a)):c||(c=so(o,e))}return u&&h?h=oo(h):h||t===g||(h=so(i,t)),r&&(u=!0,l=n.apply(p,a)),!u||h||c||(a=p=b),l}var a,c,l,s,p,h,v,_=0,g=!1,y=!0;if("function"!=typeof n)throw new Ji(z);if(t=0>t?0:+t||0,r===!0){var d=!0;y=!1}else Wu(r)&&(d=!!r.leading,g="maxWait"in r&&bo(+r.maxWait||0,t),y="trailing"in r?!!r.trailing:y);return f.cancel=e,f}function vu(n,t){if("function"!=typeof n||t&&"function"!=typeof t)throw new Ji(z);var r=function(){var e=arguments,u=t?t.apply(this,e):e[0],i=r.cache;if(i.has(u))return i.get(u);var o=n.apply(this,e);return r.cache=i.set(u,o),o};return r.cache=new vu.Cache,r}function _u(n){if("function"!=typeof n)throw new Ji(z);return function(){return!n.apply(this,arguments)}}function gu(n){return pu(2,n)}function yu(n,t){if("function"!=typeof n)throw new Ji(z);return t=bo(t===b?n.length-1:+t||0,0),function(){for(var r=arguments,e=-1,u=bo(r.length-t,0),i=zi(u);++e<u;)i[e]=r[t+e];switch(t){case 0:return n.call(this,i);case 1:return n.call(this,r[0],i);case 2:return n.call(this,r[0],r[1],i)}var o=zi(t+1);for(e=-1;++e<t;)o[e]=r[e];return o[t]=i,n.apply(this,o)}}function du(n){if("function"!=typeof n)throw new Ji(z);return function(t){return n.apply(this,t)}}function mu(n,t,r){var e=!0,u=!0;if("function"!=typeof n)throw new Ji(z);return r===!1?e=!1:Wu(r)&&(e="leading"in r?!!r.leading:e,u="trailing"in r?!!r.trailing:u),hu(n,t,{leading:e,maxWait:+t,trailing:u})}function wu(n,t){return t=null==t?Ri:t,Tr(t,E,b,[n],[])}function xu(n,t,r,e){return t&&"boolean"!=typeof t&&Qr(n,t,r)?t=!1:"function"==typeof t&&(e=r,r=t,t=!1),"function"==typeof r?bt(n,t,or(r,e,1)):bt(n,t)}function bu(n,t,r){return"function"==typeof t?bt(n,!0,or(t,r,1)):bt(n,!0)}function Au(n,t){return n>t}function ju(n,t){return n>=t}function ku(n){return v(n)&&Zr(n)&&no.call(n,"callee")&&!co.call(n,"callee")}function Iu(n){return n===!0||n===!1||v(n)&&ro.call(n)==P}function Ru(n){return v(n)&&ro.call(n)==K}function Ou(n){return!!n&&1===n.nodeType&&v(n)&&!zu(n)}function Eu(n){return null==n?!0:Zr(n)&&(Cf(n)||qu(n)||ku(n)||v(n)&&Su(n.splice))?!n.length:!Df(n).length}function Cu(n,t,r,e){r="function"==typeof r?or(r,e,3):b;var u=r?r(n,t):b;return u===b?Nt(n,t,r):!!u}function Uu(n){return v(n)&&"string"==typeof n.message&&ro.call(n)==V}function $u(n){return"number"==typeof n&&wo(n)}function Su(n){return Wu(n)&&ro.call(n)==Y}function Wu(n){var t=typeof n;return!!n&&("object"==t||"function"==t)}function Fu(n,t,r,e){return r="function"==typeof r?or(r,e,3):b,Lt(n,Pr(t),r)}function Nu(n){return Bu(n)&&n!=+n}function Tu(n){return null==n?!1:Su(n)?uo.test(Qi.call(n)):v(n)&&$n.test(n)}function Lu(n){return null===n}function Bu(n){return"number"==typeof n||v(n)&&ro.call(n)==J}function zu(n){var t;if(!v(n)||ro.call(n)!=X||ku(n)||!no.call(n,"constructor")&&(t=n.constructor,"function"==typeof t&&!(t instanceof t)))return!1;var r;return Ut(n,function(n,t){r=t}),r===b||no.call(n,r)}function Du(n){return Wu(n)&&ro.call(n)==Z}function qu(n){return"string"==typeof n||v(n)&&ro.call(n)==Q}function Mu(n){return v(n)&&re(n.length)&&!!zn[ro.call(n)]}function Pu(n){return n===b}function Ku(n,t){return t>n}function Vu(n,t){return t>=n}function Yu(n){var t=n?qo(n):0;return re(t)?t?et(n):[]:ii(n)}function Gu(n){return wt(n,ni(n))}function Ju(n,t,r){var e=Fo(n);return r&&Qr(n,t,r)&&(t=b),t?dt(e,t):e}function Xu(n){return Wt(n,ni(n))}function Zu(n,t,r){var e=null==n?b:Ft(n,pe(t),t+"");return e===b?r:e}function Hu(n,t){if(null==n)return!1;var r=no.call(n,t);if(!r&&!ne(t)){if(t=pe(t),n=1==t.length?n:Ft(n,Jt(t,0,-1)),null==n)return!1;t=Ie(t),r=no.call(n,t)}return r||re(n.length)&&Hr(t,n.length)&&(Cf(n)||ku(n))}function Qu(n,t,r){r&&Qr(n,t,r)&&(t=b);for(var e=-1,u=Df(n),i=u.length,o={};++e<i;){var f=u[e],a=n[f];t?no.call(o,a)?o[a].push(f):o[a]=[f]:o[a]=f}return o}function ni(n){if(null==n)return[];Wu(n)||(n=Vi(n));var t=n.length;t=t&&re(t)&&(Cf(n)||ku(n))&&t||0;for(var r=n.constructor,e=-1,u="function"==typeof r&&r.prototype===n,i=zi(t),o=t>0;++e<t;)i[e]=e+"";for(var f in n)o&&Hr(f,t)||"constructor"==f&&(u||!no.call(n,f))||i.push(f);return i}function ti(n){n=se(n);for(var t=-1,r=Df(n),e=r.length,u=zi(e);++t<e;){var i=r[t];u[t]=[i,n[i]]}return u}function ri(n,t,r){var e=null==n?b:n[t];return e===b&&(null==n||ne(t,n)||(t=pe(t),n=1==t.length?n:Ft(n,Jt(t,0,-1)),e=null==n?b:n[Ie(t)]),e=e===b?r:e),Su(e)?e.call(n):e}function ei(n,t,r){if(null==n)return n;var e=t+"";t=null!=n[e]||ne(t,n)?[e]:pe(t);for(var u=-1,i=t.length,o=i-1,f=n;null!=f&&++u<i;){var a=t[u];Wu(f)&&(u==o?f[a]=r:null==f[a]&&(f[a]=Hr(t[u+1])?[]:{})),f=f[a]}return n}function ui(n,t,r,e){var u=Cf(n)||Mu(n);if(t=Dr(t,e,4),null==r)if(u||Wu(n)){var i=n.constructor;r=u?Cf(n)?new i:[]:Fo(Su(i)?i.prototype:b)}else r={};return(u?ut:$t)(n,function(n,e,u){return t(r,n,e,u)}),r}function ii(n){return tr(n,Df(n))}function oi(n){return tr(n,ni(n))}function fi(n,t,r){return t=+t||0,r===b?(r=t,t=0):r=+r||0,n>=Ao(t,r)&&n<bo(t,r)}function ai(n,t,r){r&&Qr(n,t,r)&&(t=r=b);var e=null==n,u=null==t;if(null==r&&(u&&"boolean"==typeof n?(r=n,n=1):"boolean"==typeof t&&(r=t,u=!0)),e&&u&&(t=1,u=!1),n=+n||0,u?(t=n,n=0):t=+t||0,r||n%1||t%1){var i=Io();return Ao(n+i*(t-n+fo("1e-"+((i+"").length-1))),t)}return Yt(n,t)}function ci(n){return n=u(n),n&&n.charAt(0).toUpperCase()+n.slice(1)}function li(n){
return n=u(n),n&&n.replace(Wn,c).replace(Rn,"")}function si(n,t,r){n=u(n),t+="";var e=n.length;return r=r===b?e:Ao(0>r?0:+r||0,e),r-=t.length,r>=0&&n.indexOf(t,r)==r}function pi(n){return n=u(n),n&&dn.test(n)?n.replace(gn,l):n}function hi(n){return n=u(n),n&&In.test(n)?n.replace(kn,s):n||"(?:)"}function vi(n,t,r){n=u(n),t=+t;var e=n.length;if(e>=t||!wo(t))return n;var i=(t-e)/2,o=yo(i),f=_o(i);return r=Sr("",f,r),r.slice(0,o)+n+r}function _i(n,t,r){return(r?Qr(n,t,r):null==t)?t=0:t&&(t=+t),n=mi(n),ko(n,t||(Un.test(n)?16:10))}function gi(n,t){var r="";if(n=u(n),t=+t,1>t||!n||!wo(t))return r;do t%2&&(r+=n),t=yo(t/2),n+=n;while(t);return r}function yi(n,t,r){return n=u(n),r=null==r?0:Ao(0>r?0:+r||0,n.length),n.lastIndexOf(t,r)==r}function di(n,t,r){var e=G.templateSettings;r&&Qr(n,t,r)&&(t=r=b),n=u(n),t=yt(dt({},r||t),e,gt);var i,o,f=yt(dt({},t.imports),e.imports,gt),a=Df(f),c=tr(f,a),l=0,s=t.interpolate||Fn,h="__p += '",v=Yi((t.escape||Fn).source+"|"+s.source+"|"+(s===xn?En:Fn).source+"|"+(t.evaluate||Fn).source+"|$","g"),_="//# sourceURL="+("sourceURL"in t?t.sourceURL:"lodash.templateSources["+ ++Bn+"]")+"\n";n.replace(v,function(t,r,e,u,f,a){return e||(e=u),h+=n.slice(l,a).replace(Nn,p),r&&(i=!0,h+="' +\n__e("+r+") +\n'"),f&&(o=!0,h+="';\n"+f+";\n__p += '"),e&&(h+="' +\n((__t = ("+e+")) == null ? '' : __t) +\n'"),l=a+t.length,t}),h+="';\n";var g=t.variable;g||(h="with (obj) {\n"+h+"\n}\n"),h=(o?h.replace(pn,""):h).replace(hn,"$1").replace(vn,"$1;"),h="function("+(g||"obj")+") {\n"+(g?"":"obj || (obj = {});\n")+"var __t, __p = ''"+(i?", __e = _.escape":"")+(o?", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n":";\n")+h+"return __p\n}";var y=Hf(function(){return Mi(a,_+"return "+h).apply(b,c)});if(y.source=h,Uu(y))throw y;return y}function mi(n,t,r){var e=n;return(n=u(n))?(r?Qr(e,t,r):null==t)?n.slice(d(n),m(n)+1):(t+="",n.slice(i(n,t),o(n,t)+1)):n}function wi(n,t,r){var e=n;return n=u(n),n?(r?Qr(e,t,r):null==t)?n.slice(d(n)):n.slice(i(n,t+"")):n}function xi(n,t,r){var e=n;return n=u(n),n?(r?Qr(e,t,r):null==t)?n.slice(0,m(n)+1):n.slice(0,o(n,t+"")+1):n}function bi(n,t,r){r&&Qr(n,t,r)&&(t=b);var e=S,i=W;if(null!=t)if(Wu(t)){var o="separator"in t?t.separator:o;e="length"in t?+t.length||0:e,i="omission"in t?u(t.omission):i}else e=+t||0;if(n=u(n),e>=n.length)return n;var f=e-i.length;if(1>f)return i;var a=n.slice(0,f);if(null==o)return a+i;if(Du(o)){if(n.slice(f).search(o)){var c,l,s=n.slice(0,f);for(o.global||(o=Yi(o.source,(Cn.exec(o)||"")+"g")),o.lastIndex=0;c=o.exec(s);)l=c.index;a=a.slice(0,null==l?f:l)}}else if(n.indexOf(o,f)!=f){var p=a.lastIndexOf(o);p>-1&&(a=a.slice(0,p))}return a+i}function Ai(n){return n=u(n),n&&yn.test(n)?n.replace(_n,w):n}function ji(n,t,r){return r&&Qr(n,t,r)&&(t=b),n=u(n),n.match(t||Tn)||[]}function ki(n,t,r){return r&&Qr(n,t,r)&&(t=b),v(n)?Oi(n):xt(n,t)}function Ii(n){return function(){return n}}function Ri(n){return n}function Oi(n){return zt(bt(n,!0))}function Ei(n,t){return Dt(n,bt(t,!0))}function Ci(n,t,r){if(null==r){var e=Wu(t),u=e?Df(t):b,i=u&&u.length?Wt(t,u):b;(i?i.length:e)||(i=!1,r=t,t=n,n=this)}i||(i=Wt(t,Df(t)));var o=!0,f=-1,a=Su(n),c=i.length;r===!1?o=!1:Wu(r)&&"chain"in r&&(o=r.chain);for(;++f<c;){var l=i[f],s=t[l];n[l]=s,a&&(n.prototype[l]=function(t){return function(){var r=this.__chain__;if(o||r){var e=n(this.__wrapped__),u=e.__actions__=et(this.__actions__);return u.push({func:t,args:arguments,thisArg:n}),e.__chain__=r,e}return t.apply(n,lt([this.value()],arguments))}}(s))}return n}function Ui(){return nt._=eo,this}function $i(){}function Si(n){return ne(n)?Pt(n):Kt(n)}function Wi(n){return function(t){return Ft(n,pe(t),t+"")}}function Fi(n,t,r){r&&Qr(n,t,r)&&(t=r=b),n=+n||0,r=null==r?1:+r||0,null==t?(t=n,n=0):t=+t||0;for(var e=-1,u=bo(_o((t-n)/(r||1)),0),i=zi(u);++e<u;)i[e]=n,n+=r;return i}function Ni(n,t,r){if(n=yo(n),1>n||!wo(n))return[];var e=-1,u=zi(Ao(n,Eo));for(t=or(t,r,1);++e<n;)Eo>e?u[e]=t(e):t(e);return u}function Ti(n){var t=++to;return u(n)+t}function Li(n,t){return(+n||0)+(+t||0)}function Bi(n,t,r){return r&&Qr(n,t,r)&&(t=b),t=Dr(t,r,3),1==t.length?vt(Cf(n)?n:le(n),t):Qt(n,t)}_=_?tt.defaults(nt.Object(),_,tt.pick(nt,Ln)):nt;var zi=_.Array,Di=_.Date,qi=_.Error,Mi=_.Function,Pi=_.Math,Ki=_.Number,Vi=_.Object,Yi=_.RegExp,Gi=_.String,Ji=_.TypeError,Xi=zi.prototype,Zi=Vi.prototype,Hi=Gi.prototype,Qi=Mi.prototype.toString,no=Zi.hasOwnProperty,to=0,ro=Zi.toString,eo=nt._,uo=Yi("^"+Qi.call(no).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),io=_.ArrayBuffer,oo=_.clearTimeout,fo=_.parseFloat,ao=Pi.pow,co=Zi.propertyIsEnumerable,lo=Kr(_,"Set"),so=_.setTimeout,po=Xi.splice,ho=_.Uint8Array,vo=Kr(_,"WeakMap"),_o=Pi.ceil,go=Kr(Vi,"create"),yo=Pi.floor,mo=Kr(zi,"isArray"),wo=_.isFinite,xo=Kr(Vi,"keys"),bo=Pi.max,Ao=Pi.min,jo=Kr(Di,"now"),ko=_.parseInt,Io=Pi.random,Ro=Ki.NEGATIVE_INFINITY,Oo=Ki.POSITIVE_INFINITY,Eo=4294967295,Co=Eo-1,Uo=Eo>>>1,$o=9007199254740991,So=vo&&new vo,Wo={};G.support={};G.templateSettings={escape:mn,evaluate:wn,interpolate:xn,variable:"",imports:{_:G}};var Fo=function(){function n(){}return function(t){if(Wu(t)){n.prototype=t;var r=new n;n.prototype=b}return r||{}}}(),No=pr($t),To=pr(St,!0),Lo=hr(),Bo=hr(!0),zo=So?function(n,t){return So.set(n,t),n}:Ri,Do=So?function(n){return So.get(n)}:$i,qo=Pt("length"),Mo=function(){var n=0,t=0;return function(r,e){var u=gf(),i=N-(u-t);if(t=u,i>0){if(++n>=F)return r}else n=0;return zo(r,e)}}(),Po=yu(function(n,t){return v(n)&&Zr(n)?jt(n,Ct(t,!1,!0)):[]}),Ko=br(),Vo=br(!0),Yo=yu(function(n){for(var t=n.length,e=t,u=zi(s),i=Mr(),o=i==r,f=[];e--;){var a=n[e]=Zr(a=n[e])?a:[];u[e]=o&&a.length>=120?_r(e&&a):null}var c=n[0],l=-1,s=c?c.length:0,p=u[0];n:for(;++l<s;)if(a=c[l],(p?Hn(p,a):i(f,a,0))<0){for(var e=t;--e;){var h=u[e];if((h?Hn(h,a):i(n[e],a,0))<0)continue n}p&&p.push(a),f.push(a)}return f}),Go=yu(function(t,r){r=Ct(r);var e=mt(t,r);return Vt(t,r.sort(n)),e}),Jo=Nr(),Xo=Nr(!0),Zo=yu(function(n){return nr(Ct(n,!1,!0))}),Ho=yu(function(n,t){return Zr(n)?jt(n,t):[]}),Qo=yu(Te),nf=yu(function(n){var t=n.length,r=t>2?n[t-2]:b,e=t>1?n[t-1]:b;return t>2&&"function"==typeof r?t-=2:(r=t>1&&"function"==typeof e?(--t,e):b,e=b),n.length=t,Le(n,r,e)}),tf=yu(function(n){return n=Ct(n),this.thru(function(t){return rt(Cf(t)?t:[se(t)],n)})}),rf=yu(function(n,t){return mt(n,Ct(t))}),ef=lr(function(n,t,r){no.call(n,r)?++n[r]:n[r]=1}),uf=xr(No),of=xr(To,!0),ff=kr(ut,No),af=kr(it,To),cf=lr(function(n,t,r){no.call(n,r)?n[r].push(t):n[r]=[t]}),lf=lr(function(n,t,r){n[r]=t}),sf=yu(function(n,t,r){var e=-1,u="function"==typeof t,i=ne(t),o=Zr(n)?zi(n.length):[];return No(n,function(n){var f=u?t:i&&null!=n?n[t]:b;o[++e]=f?f.apply(n,r):Xr(n,t,r)}),o}),pf=lr(function(n,t,r){n[r?0:1].push(t)},function(){return[[],[]]}),hf=Ur(st,No),vf=Ur(pt,To),_f=yu(function(n,t){if(null==n)return[];var r=t[2];return r&&Qr(t[0],t[1],r)&&(t.length=1),Ht(n,Ct(t),[])}),gf=jo||function(){return(new Di).getTime()},yf=yu(function(n,t,r){var e=j;if(r.length){var u=g(r,yf.placeholder);e|=E}return Tr(n,e,t,r,u)}),df=yu(function(n,t){t=t.length?Ct(t):Xu(n);for(var r=-1,e=t.length;++r<e;){var u=t[r];n[u]=Tr(n[u],j,n)}return n}),mf=yu(function(n,t,r){var e=j|k;if(r.length){var u=g(r,mf.placeholder);e|=E}return Tr(t,e,n,r,u)}),wf=dr(R),xf=dr(O),bf=yu(function(n,t){return At(n,1,t)}),Af=yu(function(n,t,r){return At(n,t,r)}),jf=jr(),kf=jr(!0),If=yu(function(n,t){if(t=Ct(t),"function"!=typeof n||!ot(t,e))throw new Ji(z);var r=t.length;return yu(function(e){for(var u=Ao(e.length,r);u--;)e[u]=t[u](e[u]);return n.apply(this,e)})}),Rf=Cr(E),Of=Cr(C),Ef=yu(function(n,t){return Tr(n,$,b,b,b,Ct(t))}),Cf=mo||function(n){return v(n)&&re(n.length)&&ro.call(n)==M},Uf=sr(qt),$f=sr(function(n,t,r){return r?yt(n,t,r):dt(n,t)}),Sf=mr($f,_t),Wf=mr(Uf,ie),Ff=Ar($t),Nf=Ar(St),Tf=Ir(Lo),Lf=Ir(Bo),Bf=Rr($t),zf=Rr(St),Df=xo?function(n){var t=null==n?b:n.constructor;return"function"==typeof t&&t.prototype===n||"function"!=typeof n&&Zr(n)?ce(n):Wu(n)?xo(n):[]}:ce,qf=Or(!0),Mf=Or(),Pf=yu(function(n,t){if(null==n)return{};if("function"!=typeof t[0]){var t=ct(Ct(t),Gi);return oe(n,jt(ni(n),t))}var r=or(t[0],t[1],3);return fe(n,function(n,t,e){return!r(n,t,e)})}),Kf=yu(function(n,t){return null==n?{}:"function"==typeof t[0]?fe(n,or(t[0],t[1],3)):oe(n,Ct(t))}),Vf=gr(function(n,t,r){return t=t.toLowerCase(),n+(r?t.charAt(0).toUpperCase()+t.slice(1):t)}),Yf=gr(function(n,t,r){return n+(r?"-":"")+t.toLowerCase()}),Gf=Er(),Jf=Er(!0),Xf=gr(function(n,t,r){return n+(r?"_":"")+t.toLowerCase()}),Zf=gr(function(n,t,r){return n+(r?" ":"")+(t.charAt(0).toUpperCase()+t.slice(1))}),Hf=yu(function(n,t){try{return n.apply(b,t)}catch(r){return Uu(r)?r:new qi(r)}}),Qf=yu(function(n,t){return function(r){return Xr(r,n,t)}}),na=yu(function(n,t){return function(r){return Xr(n,r,t)}}),ta=Fr("ceil"),ra=Fr("floor"),ea=wr(Au,Ro),ua=wr(Ku,Oo),ia=Fr("round");return G.prototype=H.prototype,nn.prototype=Fo(H.prototype),nn.prototype.constructor=nn,qn.prototype=Fo(H.prototype),qn.prototype.constructor=qn,Vn.prototype["delete"]=Yn,Vn.prototype.get=Gn,Vn.prototype.has=Jn,Vn.prototype.set=Xn,Zn.prototype.push=Qn,vu.Cache=Vn,G.after=lu,G.ary=su,G.assign=$f,G.at=rf,G.before=pu,G.bind=yf,G.bindAll=df,G.bindKey=mf,G.callback=ki,G.chain=De,G.chunk=ve,G.compact=_e,G.constant=Ii,G.countBy=ef,G.create=Ju,G.curry=wf,G.curryRight=xf,G.debounce=hu,G.defaults=Sf,G.defaultsDeep=Wf,G.defer=bf,G.delay=Af,G.difference=Po,G.drop=ge,G.dropRight=ye,G.dropRightWhile=de,G.dropWhile=me,G.fill=we,G.filter=Ze,G.flatten=be,G.flattenDeep=Ae,G.flow=jf,G.flowRight=kf,G.forEach=ff,G.forEachRight=af,G.forIn=Tf,G.forInRight=Lf,G.forOwn=Bf,G.forOwnRight=zf,G.functions=Xu,G.groupBy=cf,G.indexBy=lf,G.initial=ke,G.intersection=Yo,G.invert=Qu,G.invoke=sf,G.keys=Df,G.keysIn=ni,G.map=nu,G.mapKeys=qf,G.mapValues=Mf,G.matches=Oi,G.matchesProperty=Ei,G.memoize=vu,G.merge=Uf,G.method=Qf,G.methodOf=na,G.mixin=Ci,G.modArgs=If,G.negate=_u,G.omit=Pf,G.once=gu,G.pairs=ti,G.partial=Rf,G.partialRight=Of,G.partition=pf,G.pick=Kf,G.pluck=tu,G.property=Si,G.propertyOf=Wi,G.pull=Oe,G.pullAt=Go,G.range=Fi,G.rearg=Ef,G.reject=ru,G.remove=Ee,G.rest=Ce,G.restParam=yu,G.set=ei,G.shuffle=uu,G.slice=Ue,G.sortBy=fu,G.sortByAll=_f,G.sortByOrder=au,G.spread=du,G.take=$e,G.takeRight=Se,G.takeRightWhile=We,G.takeWhile=Fe,G.tap=qe,G.throttle=mu,G.thru=Me,G.times=Ni,G.toArray=Yu,G.toPlainObject=Gu,G.transform=ui,G.union=Zo,G.uniq=Ne,G.unzip=Te,G.unzipWith=Le,G.values=ii,G.valuesIn=oi,G.where=cu,G.without=Ho,G.wrap=wu,G.xor=Be,G.zip=Qo,G.zipObject=ze,G.zipWith=nf,G.backflow=kf,G.collect=nu,G.compose=kf,G.each=ff,G.eachRight=af,G.extend=$f,G.iteratee=ki,G.methods=Xu,G.object=ze,G.select=Ze,G.tail=Ce,G.unique=Ne,Ci(G,G),G.add=Li,G.attempt=Hf,G.camelCase=Vf,G.capitalize=ci,G.ceil=ta,G.clone=xu,G.cloneDeep=bu,G.deburr=li,G.endsWith=si,G.escape=pi,G.escapeRegExp=hi,G.every=Xe,G.find=uf,G.findIndex=Ko,G.findKey=Ff,G.findLast=of,G.findLastIndex=Vo,G.findLastKey=Nf,G.findWhere=He,G.first=xe,G.floor=ra,G.get=Zu,G.gt=Au,G.gte=ju,G.has=Hu,G.identity=Ri,G.includes=Qe,G.indexOf=je,G.inRange=fi,G.isArguments=ku,G.isArray=Cf,G.isBoolean=Iu,G.isDate=Ru,G.isElement=Ou,G.isEmpty=Eu,G.isEqual=Cu,G.isError=Uu,G.isFinite=$u,G.isFunction=Su,G.isMatch=Fu,G.isNaN=Nu,G.isNative=Tu,G.isNull=Lu,G.isNumber=Bu,G.isObject=Wu,G.isPlainObject=zu,G.isRegExp=Du,G.isString=qu,G.isTypedArray=Mu,G.isUndefined=Pu,G.kebabCase=Yf,G.last=Ie,G.lastIndexOf=Re,G.lt=Ku,G.lte=Vu,G.max=ea,G.min=ua,G.noConflict=Ui,G.noop=$i,G.now=gf,G.pad=vi,G.padLeft=Gf,G.padRight=Jf,G.parseInt=_i,G.random=ai,G.reduce=hf,G.reduceRight=vf,G.repeat=gi,G.result=ri,G.round=ia,G.runInContext=x,G.size=iu,G.snakeCase=Xf,G.some=ou,G.sortedIndex=Jo,G.sortedLastIndex=Xo,G.startCase=Zf,G.startsWith=yi,G.sum=Bi,G.template=di,G.trim=mi,G.trimLeft=wi,G.trimRight=xi,G.trunc=bi,G.unescape=Ai,G.uniqueId=Ti,G.words=ji,G.all=Xe,G.any=ou,G.contains=Qe,G.eq=Cu,G.detect=uf,G.foldl=hf,G.foldr=vf,G.head=xe,G.include=Qe,G.inject=hf,Ci(G,function(){var n={};return $t(G,function(t,r){G.prototype[r]||(n[r]=t)}),n}(),!1),G.sample=eu,G.prototype.sample=function(n){return this.__chain__||null!=n?this.thru(function(t){return eu(t,n)}):eu(this.value())},G.VERSION=A,ut(["bind","bindKey","curry","curryRight","partial","partialRight"],function(n){G[n].placeholder=G}),ut(["drop","take"],function(n,t){qn.prototype[n]=function(r){var e=this.__filtered__;if(e&&!t)return new qn(this);r=null==r?1:bo(yo(r)||0,0);var u=this.clone();return e?u.__takeCount__=Ao(u.__takeCount__,r):u.__views__.push({size:r,type:n+(u.__dir__<0?"Right":"")}),u},qn.prototype[n+"Right"]=function(t){return this.reverse()[n](t).reverse()}}),ut(["filter","map","takeWhile"],function(n,t){var r=t+1,e=r!=B;qn.prototype[n]=function(n,t){var u=this.clone();return u.__iteratees__.push({iteratee:Dr(n,t,1),type:r}),u.__filtered__=u.__filtered__||e,u}}),ut(["first","last"],function(n,t){var r="take"+(t?"Right":"");qn.prototype[n]=function(){return this[r](1).value()[0]}}),ut(["initial","rest"],function(n,t){var r="drop"+(t?"":"Right");qn.prototype[n]=function(){return this.__filtered__?new qn(this):this[r](1)}}),ut(["pluck","where"],function(n,t){var r=t?"filter":"map",e=t?zt:Si;qn.prototype[n]=function(n){return this[r](e(n))}}),qn.prototype.compact=function(){return this.filter(Ri)},qn.prototype.reject=function(n,t){return n=Dr(n,t,1),this.filter(function(t){return!n(t)})},qn.prototype.slice=function(n,t){n=null==n?0:+n||0;var r=this;return r.__filtered__&&(n>0||0>t)?new qn(r):(0>n?r=r.takeRight(-n):n&&(r=r.drop(n)),t!==b&&(t=+t||0,r=0>t?r.dropRight(-t):r.take(t-n)),r)},qn.prototype.takeRightWhile=function(n,t){return this.reverse().takeWhile(n,t).reverse()},qn.prototype.toArray=function(){return this.take(Oo)},$t(qn.prototype,function(n,t){var r=/^(?:filter|map|reject)|While$/.test(t),e=/^(?:first|last)$/.test(t),u=G[e?"take"+("last"==t?"Right":""):t];u&&(G.prototype[t]=function(){var t=e?[1]:arguments,i=this.__chain__,o=this.__wrapped__,f=!!this.__actions__.length,a=o instanceof qn,c=t[0],l=a||Cf(o);l&&r&&"function"==typeof c&&1!=c.length&&(a=l=!1);var s=function(n){return e&&i?u(n,1)[0]:u.apply(b,lt([n],t))},p={func:Me,args:[s],thisArg:b},h=a&&!f;if(e&&!i)return h?(o=o.clone(),o.__actions__.push(p),n.call(o)):u.call(b,this.value())[0];if(!e&&l){o=h?o:new qn(this);var v=n.apply(o,t);return v.__actions__.push(p),new nn(v,i)}return this.thru(s)})}),ut(["join","pop","push","replace","shift","sort","splice","split","unshift"],function(n){var t=(/^(?:replace|split)$/.test(n)?Hi:Xi)[n],r=/^(?:push|sort|unshift)$/.test(n)?"tap":"thru",e=/^(?:join|pop|replace|shift)$/.test(n);G.prototype[n]=function(){var n=arguments;return e&&!this.__chain__?t.apply(this.value(),n):this[r](function(r){return t.apply(r,n)})}}),$t(qn.prototype,function(n,t){var r=G[t];if(r){var e=r.name,u=Wo[e]||(Wo[e]=[]);u.push({name:t,func:r})}}),Wo[$r(b,k).name]=[{name:"wrapper",func:b}],qn.prototype.clone=Mn,qn.prototype.reverse=Pn,qn.prototype.value=Kn,G.prototype.chain=Pe,G.prototype.commit=Ke,G.prototype.concat=tf,G.prototype.plant=Ve,G.prototype.reverse=Ye,G.prototype.toString=Ge,G.prototype.run=G.prototype.toJSON=G.prototype.valueOf=G.prototype.value=Je,G.prototype.collect=G.prototype.map,G.prototype.head=G.prototype.first,G.prototype.select=G.prototype.filter,G.prototype.tail=G.prototype.rest,G}var b,A="3.10.1",j=1,k=2,I=4,R=8,O=16,E=32,C=64,U=128,$=256,S=30,W="...",F=150,N=16,T=200,L=1,B=2,z="Expected a function",D="__lodash_placeholder__",q="[object Arguments]",M="[object Array]",P="[object Boolean]",K="[object Date]",V="[object Error]",Y="[object Function]",G="[object Map]",J="[object Number]",X="[object Object]",Z="[object RegExp]",H="[object Set]",Q="[object String]",nn="[object WeakMap]",tn="[object ArrayBuffer]",rn="[object Float32Array]",en="[object Float64Array]",un="[object Int8Array]",on="[object Int16Array]",fn="[object Int32Array]",an="[object Uint8Array]",cn="[object Uint8ClampedArray]",ln="[object Uint16Array]",sn="[object Uint32Array]",pn=/\b__p \+= '';/g,hn=/\b(__p \+=) '' \+/g,vn=/(__e\(.*?\)|\b__t\)) \+\n'';/g,_n=/&(?:amp|lt|gt|quot|#39|#96);/g,gn=/[&<>"'`]/g,yn=RegExp(_n.source),dn=RegExp(gn.source),mn=/<%-([\s\S]+?)%>/g,wn=/<%([\s\S]+?)%>/g,xn=/<%=([\s\S]+?)%>/g,bn=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,An=/^\w*$/,jn=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g,kn=/^[:!,]|[\\^$.*+?()[\]{}|\/]|(^[0-9a-fA-Fnrtuvx])|([\n\r\u2028\u2029])/g,In=RegExp(kn.source),Rn=/[\u0300-\u036f\ufe20-\ufe23]/g,On=/\\(\\)?/g,En=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,Cn=/\w*$/,Un=/^0[xX]/,$n=/^\[object .+?Constructor\]$/,Sn=/^\d+$/,Wn=/[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g,Fn=/($^)/,Nn=/['\n\r\u2028\u2029\\]/g,Tn=function(){var n="[A-Z\\xc0-\\xd6\\xd8-\\xde]",t="[a-z\\xdf-\\xf6\\xf8-\\xff]+";return RegExp(n+"+(?="+n+t+")|"+n+"?"+t+"|"+n+"+|[0-9]+","g")}(),Ln=["Array","ArrayBuffer","Date","Error","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Math","Number","Object","RegExp","Set","String","_","clearTimeout","isFinite","parseFloat","parseInt","setTimeout","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap"],Bn=-1,zn={};zn[rn]=zn[en]=zn[un]=zn[on]=zn[fn]=zn[an]=zn[cn]=zn[ln]=zn[sn]=!0,zn[q]=zn[M]=zn[tn]=zn[P]=zn[K]=zn[V]=zn[Y]=zn[G]=zn[J]=zn[X]=zn[Z]=zn[H]=zn[Q]=zn[nn]=!1;var Dn={};Dn[q]=Dn[M]=Dn[tn]=Dn[P]=Dn[K]=Dn[rn]=Dn[en]=Dn[un]=Dn[on]=Dn[fn]=Dn[J]=Dn[X]=Dn[Z]=Dn[Q]=Dn[an]=Dn[cn]=Dn[ln]=Dn[sn]=!0,Dn[V]=Dn[Y]=Dn[G]=Dn[H]=Dn[nn]=!1;var qn={"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","Ç":"C","ç":"c","Ð":"D","ð":"d","È":"E","É":"E","Ê":"E","Ë":"E","è":"e","é":"e","ê":"e","ë":"e","Ì":"I","Í":"I","Î":"I","Ï":"I","ì":"i","í":"i","î":"i","ï":"i","Ñ":"N","ñ":"n","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","Ù":"U","Ú":"U","Û":"U","Ü":"U","ù":"u","ú":"u","û":"u","ü":"u","Ý":"Y","ý":"y","ÿ":"y","Æ":"Ae","æ":"ae","Þ":"Th","þ":"th","ß":"ss"},Mn={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"},Pn={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&#96;":"`"},Kn={"function":!0,object:!0},Vn={0:"x30",1:"x31",2:"x32",3:"x33",4:"x34",5:"x35",6:"x36",7:"x37",8:"x38",9:"x39",A:"x41",B:"x42",C:"x43",D:"x44",E:"x45",F:"x46",a:"x61",b:"x62",c:"x63",d:"x64",e:"x65",f:"x66",n:"x6e",r:"x72",t:"x74",u:"x75",v:"x76",x:"x78"},Yn={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Gn=Kn[typeof exports]&&exports&&!exports.nodeType&&exports,Jn=Kn[typeof module]&&module&&!module.nodeType&&module,Xn=Gn&&Jn&&"object"==typeof global&&global&&global.Object&&global,Zn=Kn[typeof self]&&self&&self.Object&&self,Hn=Kn[typeof window]&&window&&window.Object&&window,Qn=Jn&&Jn.exports===Gn&&Gn,nt=Xn||Hn!==(this&&this.window)&&Hn||Zn||this,tt=x();"function"==typeof define&&"object"==typeof define.amd&&define.amd?(nt._=tt,define(function(){return tt})):Gn&&Jn?Qn?(Jn.exports=tt)._=tt:Gn._=tt:nt._=tt}).call(this);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(_dereq_,module,exports){
(function (global){
var rng;if(global.crypto&&crypto.getRandomValues){var _rnds8=new Uint8Array(16);rng=function(){return crypto.getRandomValues(_rnds8),_rnds8}}if(!rng){var _rnds=new Array(16);rng=function(){for(var r,n=0;16>n;n++)0===(3&n)&&(r=4294967296*Math.random()),_rnds[n]=r>>>((3&n)<<3)&255;return _rnds}}module.exports=rng;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(_dereq_,module,exports){
function parse(e,s,r){var t=s&&r||0,n=0;for(s=s||[],e.toLowerCase().replace(/[0-9a-f]{2}/g,function(e){16>n&&(s[t+n++]=_hexToByte[e])});16>n;)s[t+n++]=0;return s}function unparse(e,s){var r=s||0,t=_byteToHex;return t[e[r++]]+t[e[r++]]+t[e[r++]]+t[e[r++]]+"-"+t[e[r++]]+t[e[r++]]+"-"+t[e[r++]]+t[e[r++]]+"-"+t[e[r++]]+t[e[r++]]+"-"+t[e[r++]]+t[e[r++]]+t[e[r++]]+t[e[r++]]+t[e[r++]]+t[e[r++]]}function v1(e,s,r){var t=s&&r||0,n=s||[];e=e||{};var o=void 0!==e.clockseq?e.clockseq:_clockseq,a=void 0!==e.msecs?e.msecs:(new Date).getTime(),u=void 0!==e.nsecs?e.nsecs:_lastNSecs+1,c=a-_lastMSecs+(u-_lastNSecs)/1e4;if(0>c&&void 0===e.clockseq&&(o=o+1&16383),(0>c||a>_lastMSecs)&&void 0===e.nsecs&&(u=0),u>=1e4)throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");_lastMSecs=a,_lastNSecs=u,_clockseq=o,a+=122192928e5;var i=(1e4*(268435455&a)+u)%4294967296;n[t++]=i>>>24&255,n[t++]=i>>>16&255,n[t++]=i>>>8&255,n[t++]=255&i;var _=a/4294967296*1e4&268435455;n[t++]=_>>>8&255,n[t++]=255&_,n[t++]=_>>>24&15|16,n[t++]=_>>>16&255,n[t++]=o>>>8|128,n[t++]=255&o;for(var d=e.node||_nodeId,v=0;6>v;v++)n[t+v]=d[v];return s?s:unparse(n)}function v4(e,s,r){var t=s&&r||0;"string"==typeof e&&(s="binary"==e?new Array(16):null,e=null),e=e||{};var n=e.random||(e.rng||_rng)();if(n[6]=15&n[6]|64,n[8]=63&n[8]|128,s)for(var o=0;16>o;o++)s[t+o]=n[o];return s||unparse(n)}for(var _rng=_dereq_("./rng"),_byteToHex=[],_hexToByte={},i=0;256>i;i++)_byteToHex[i]=(i+256).toString(16).substr(1),_hexToByte[_byteToHex[i]]=i;var _seedBytes=_rng(),_nodeId=[1|_seedBytes[0],_seedBytes[1],_seedBytes[2],_seedBytes[3],_seedBytes[4],_seedBytes[5]],_clockseq=16383&(_seedBytes[6]<<8|_seedBytes[7]),_lastMSecs=0,_lastNSecs=0,uuid=v4;uuid.v1=v1,uuid.v4=v4,uuid.parse=parse,uuid.unparse=unparse,module.exports=uuid;
},{"./rng":4}],6:[function(_dereq_,module,exports){
(function (global){
function typedArraySupport(){function t(){}try{var e=new Uint8Array(1);return e.foo=function(){return 42},e.constructor=t,42===e.foo()&&e.constructor===t&&"function"==typeof e.subarray&&0===e.subarray(1,1).byteLength}catch(r){return!1}}function kMaxLength(){return Buffer.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function Buffer(t){return this instanceof Buffer?(this.length=0,this.parent=void 0,"number"==typeof t?fromNumber(this,t):"string"==typeof t?fromString(this,t,arguments.length>1?arguments[1]:"utf8"):fromObject(this,t)):arguments.length>1?new Buffer(t,arguments[1]):new Buffer(t)}function fromNumber(t,e){if(t=allocate(t,0>e?0:0|checked(e)),!Buffer.TYPED_ARRAY_SUPPORT)for(var r=0;e>r;r++)t[r]=0;return t}function fromString(t,e,r){("string"!=typeof r||""===r)&&(r="utf8");var n=0|byteLength(e,r);return t=allocate(t,n),t.write(e,r),t}function fromObject(t,e){if(Buffer.isBuffer(e))return fromBuffer(t,e);if(isArray(e))return fromArray(t,e);if(null==e)throw new TypeError("must start with number, buffer, array or string");if("undefined"!=typeof ArrayBuffer){if(e.buffer instanceof ArrayBuffer)return fromTypedArray(t,e);if(e instanceof ArrayBuffer)return fromArrayBuffer(t,e)}return e.length?fromArrayLike(t,e):fromJsonObject(t,e)}function fromBuffer(t,e){var r=0|checked(e.length);return t=allocate(t,r),e.copy(t,0,0,r),t}function fromArray(t,e){var r=0|checked(e.length);t=allocate(t,r);for(var n=0;r>n;n+=1)t[n]=255&e[n];return t}function fromTypedArray(t,e){var r=0|checked(e.length);t=allocate(t,r);for(var n=0;r>n;n+=1)t[n]=255&e[n];return t}function fromArrayBuffer(t,e){return Buffer.TYPED_ARRAY_SUPPORT?(e.byteLength,t=Buffer._augment(new Uint8Array(e))):t=fromTypedArray(t,new Uint8Array(e)),t}function fromArrayLike(t,e){var r=0|checked(e.length);t=allocate(t,r);for(var n=0;r>n;n+=1)t[n]=255&e[n];return t}function fromJsonObject(t,e){var r,n=0;"Buffer"===e.type&&isArray(e.data)&&(r=e.data,n=0|checked(r.length)),t=allocate(t,n);for(var i=0;n>i;i+=1)t[i]=255&r[i];return t}function allocate(t,e){Buffer.TYPED_ARRAY_SUPPORT?(t=Buffer._augment(new Uint8Array(e)),t.__proto__=Buffer.prototype):(t.length=e,t._isBuffer=!0);var r=0!==e&&e<=Buffer.poolSize>>>1;return r&&(t.parent=rootParent),t}function checked(t){if(t>=kMaxLength())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+kMaxLength().toString(16)+" bytes");return 0|t}function SlowBuffer(t,e){if(!(this instanceof SlowBuffer))return new SlowBuffer(t,e);var r=new Buffer(t,e);return delete r.parent,r}function byteLength(t,e){"string"!=typeof t&&(t=""+t);var r=t.length;if(0===r)return 0;for(var n=!1;;)switch(e){case"ascii":case"binary":case"raw":case"raws":return r;case"utf8":case"utf-8":return utf8ToBytes(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return base64ToBytes(t).length;default:if(n)return utf8ToBytes(t).length;e=(""+e).toLowerCase(),n=!0}}function slowToString(t,e,r){var n=!1;if(e=0|e,r=void 0===r||r===1/0?this.length:0|r,t||(t="utf8"),0>e&&(e=0),r>this.length&&(r=this.length),e>=r)return"";for(;;)switch(t){case"hex":return hexSlice(this,e,r);case"utf8":case"utf-8":return utf8Slice(this,e,r);case"ascii":return asciiSlice(this,e,r);case"binary":return binarySlice(this,e,r);case"base64":return base64Slice(this,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return utf16leSlice(this,e,r);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}function hexWrite(t,e,r,n){r=Number(r)||0;var i=t.length-r;n?(n=Number(n),n>i&&(n=i)):n=i;var f=e.length;if(f%2!==0)throw new Error("Invalid hex string");n>f/2&&(n=f/2);for(var o=0;n>o;o++){var u=parseInt(e.substr(2*o,2),16);if(isNaN(u))throw new Error("Invalid hex string");t[r+o]=u}return o}function utf8Write(t,e,r,n){return blitBuffer(utf8ToBytes(e,t.length-r),t,r,n)}function asciiWrite(t,e,r,n){return blitBuffer(asciiToBytes(e),t,r,n)}function binaryWrite(t,e,r,n){return asciiWrite(t,e,r,n)}function base64Write(t,e,r,n){return blitBuffer(base64ToBytes(e),t,r,n)}function ucs2Write(t,e,r,n){return blitBuffer(utf16leToBytes(e,t.length-r),t,r,n)}function base64Slice(t,e,r){return 0===e&&r===t.length?base64.fromByteArray(t):base64.fromByteArray(t.slice(e,r))}function utf8Slice(t,e,r){r=Math.min(t.length,r);for(var n=[],i=e;r>i;){var f=t[i],o=null,u=f>239?4:f>223?3:f>191?2:1;if(r>=i+u){var s,a,h,c;switch(u){case 1:128>f&&(o=f);break;case 2:s=t[i+1],128===(192&s)&&(c=(31&f)<<6|63&s,c>127&&(o=c));break;case 3:s=t[i+1],a=t[i+2],128===(192&s)&&128===(192&a)&&(c=(15&f)<<12|(63&s)<<6|63&a,c>2047&&(55296>c||c>57343)&&(o=c));break;case 4:s=t[i+1],a=t[i+2],h=t[i+3],128===(192&s)&&128===(192&a)&&128===(192&h)&&(c=(15&f)<<18|(63&s)<<12|(63&a)<<6|63&h,c>65535&&1114112>c&&(o=c))}}null===o?(o=65533,u=1):o>65535&&(o-=65536,n.push(o>>>10&1023|55296),o=56320|1023&o),n.push(o),i+=u}return decodeCodePointsArray(n)}function decodeCodePointsArray(t){var e=t.length;if(MAX_ARGUMENTS_LENGTH>=e)return String.fromCharCode.apply(String,t);for(var r="",n=0;e>n;)r+=String.fromCharCode.apply(String,t.slice(n,n+=MAX_ARGUMENTS_LENGTH));return r}function asciiSlice(t,e,r){var n="";r=Math.min(t.length,r);for(var i=e;r>i;i++)n+=String.fromCharCode(127&t[i]);return n}function binarySlice(t,e,r){var n="";r=Math.min(t.length,r);for(var i=e;r>i;i++)n+=String.fromCharCode(t[i]);return n}function hexSlice(t,e,r){var n=t.length;(!e||0>e)&&(e=0),(!r||0>r||r>n)&&(r=n);for(var i="",f=e;r>f;f++)i+=toHex(t[f]);return i}function utf16leSlice(t,e,r){for(var n=t.slice(e,r),i="",f=0;f<n.length;f+=2)i+=String.fromCharCode(n[f]+256*n[f+1]);return i}function checkOffset(t,e,r){if(t%1!==0||0>t)throw new RangeError("offset is not uint");if(t+e>r)throw new RangeError("Trying to access beyond buffer length")}function checkInt(t,e,r,n,i,f){if(!Buffer.isBuffer(t))throw new TypeError("buffer must be a Buffer instance");if(e>i||f>e)throw new RangeError("value is out of bounds");if(r+n>t.length)throw new RangeError("index out of range")}function objectWriteUInt16(t,e,r,n){0>e&&(e=65535+e+1);for(var i=0,f=Math.min(t.length-r,2);f>i;i++)t[r+i]=(e&255<<8*(n?i:1-i))>>>8*(n?i:1-i)}function objectWriteUInt32(t,e,r,n){0>e&&(e=4294967295+e+1);for(var i=0,f=Math.min(t.length-r,4);f>i;i++)t[r+i]=e>>>8*(n?i:3-i)&255}function checkIEEE754(t,e,r,n,i,f){if(e>i||f>e)throw new RangeError("value is out of bounds");if(r+n>t.length)throw new RangeError("index out of range");if(0>r)throw new RangeError("index out of range")}function writeFloat(t,e,r,n,i){return i||checkIEEE754(t,e,r,4,3.4028234663852886e38,-3.4028234663852886e38),ieee754.write(t,e,r,n,23,4),r+4}function writeDouble(t,e,r,n,i){return i||checkIEEE754(t,e,r,8,1.7976931348623157e308,-1.7976931348623157e308),ieee754.write(t,e,r,n,52,8),r+8}function base64clean(t){if(t=stringtrim(t).replace(INVALID_BASE64_RE,""),t.length<2)return"";for(;t.length%4!==0;)t+="=";return t}function stringtrim(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}function toHex(t){return 16>t?"0"+t.toString(16):t.toString(16)}function utf8ToBytes(t,e){e=e||1/0;for(var r,n=t.length,i=null,f=[],o=0;n>o;o++){if(r=t.charCodeAt(o),r>55295&&57344>r){if(!i){if(r>56319){(e-=3)>-1&&f.push(239,191,189);continue}if(o+1===n){(e-=3)>-1&&f.push(239,191,189);continue}i=r;continue}if(56320>r){(e-=3)>-1&&f.push(239,191,189),i=r;continue}r=i-55296<<10|r-56320|65536}else i&&(e-=3)>-1&&f.push(239,191,189);if(i=null,128>r){if((e-=1)<0)break;f.push(r)}else if(2048>r){if((e-=2)<0)break;f.push(r>>6|192,63&r|128)}else if(65536>r){if((e-=3)<0)break;f.push(r>>12|224,r>>6&63|128,63&r|128)}else{if(!(1114112>r))throw new Error("Invalid code point");if((e-=4)<0)break;f.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}}return f}function asciiToBytes(t){for(var e=[],r=0;r<t.length;r++)e.push(255&t.charCodeAt(r));return e}function utf16leToBytes(t,e){for(var r,n,i,f=[],o=0;o<t.length&&!((e-=2)<0);o++)r=t.charCodeAt(o),n=r>>8,i=r%256,f.push(i),f.push(n);return f}function base64ToBytes(t){return base64.toByteArray(base64clean(t))}function blitBuffer(t,e,r,n){for(var i=0;n>i&&!(i+r>=e.length||i>=t.length);i++)e[i+r]=t[i];return i}var base64=_dereq_("base64-js"),ieee754=_dereq_("ieee754"),isArray=_dereq_("is-array");exports.Buffer=Buffer,exports.SlowBuffer=SlowBuffer,exports.INSPECT_MAX_BYTES=50,Buffer.poolSize=8192;var rootParent={};Buffer.TYPED_ARRAY_SUPPORT=void 0!==global.TYPED_ARRAY_SUPPORT?global.TYPED_ARRAY_SUPPORT:typedArraySupport(),Buffer.TYPED_ARRAY_SUPPORT&&(Buffer.prototype.__proto__=Uint8Array.prototype,Buffer.__proto__=Uint8Array),Buffer.isBuffer=function(t){return!(null==t||!t._isBuffer)},Buffer.compare=function(t,e){if(!Buffer.isBuffer(t)||!Buffer.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var r=t.length,n=e.length,i=0,f=Math.min(r,n);f>i&&t[i]===e[i];)++i;return i!==f&&(r=t[i],n=e[i]),n>r?-1:r>n?1:0},Buffer.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"raw":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},Buffer.concat=function(t,e){if(!isArray(t))throw new TypeError("list argument must be an Array of Buffers.");if(0===t.length)return new Buffer(0);var r;if(void 0===e)for(e=0,r=0;r<t.length;r++)e+=t[r].length;var n=new Buffer(e),i=0;for(r=0;r<t.length;r++){var f=t[r];f.copy(n,i),i+=f.length}return n},Buffer.byteLength=byteLength,Buffer.prototype.length=void 0,Buffer.prototype.parent=void 0,Buffer.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?utf8Slice(this,0,t):slowToString.apply(this,arguments)},Buffer.prototype.equals=function(t){if(!Buffer.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t?!0:0===Buffer.compare(this,t)},Buffer.prototype.inspect=function(){var t="",e=exports.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,e).match(/.{2}/g).join(" "),this.length>e&&(t+=" ... ")),"<Buffer "+t+">"},Buffer.prototype.compare=function(t){if(!Buffer.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t?0:Buffer.compare(this,t)},Buffer.prototype.indexOf=function(t,e){function r(t,e,r){for(var n=-1,i=0;r+i<t.length;i++)if(t[r+i]===e[-1===n?0:i-n]){if(-1===n&&(n=i),i-n+1===e.length)return r+n}else n=-1;return-1}if(e>2147483647?e=2147483647:-2147483648>e&&(e=-2147483648),e>>=0,0===this.length)return-1;if(e>=this.length)return-1;if(0>e&&(e=Math.max(this.length+e,0)),"string"==typeof t)return 0===t.length?-1:String.prototype.indexOf.call(this,t,e);if(Buffer.isBuffer(t))return r(this,t,e);if("number"==typeof t)return Buffer.TYPED_ARRAY_SUPPORT&&"function"===Uint8Array.prototype.indexOf?Uint8Array.prototype.indexOf.call(this,t,e):r(this,[t],e);throw new TypeError("val must be string, number or Buffer")},Buffer.prototype.get=function(t){return console.log(".get() is deprecated. Access using array indexes instead."),this.readUInt8(t)},Buffer.prototype.set=function(t,e){return console.log(".set() is deprecated. Access using array indexes instead."),this.writeUInt8(t,e)},Buffer.prototype.write=function(t,e,r,n){if(void 0===e)n="utf8",r=this.length,e=0;else if(void 0===r&&"string"==typeof e)n=e,r=this.length,e=0;else if(isFinite(e))e=0|e,isFinite(r)?(r=0|r,void 0===n&&(n="utf8")):(n=r,r=void 0);else{var i=n;n=e,e=0|r,r=i}var f=this.length-e;if((void 0===r||r>f)&&(r=f),t.length>0&&(0>r||0>e)||e>this.length)throw new RangeError("attempt to write outside buffer bounds");n||(n="utf8");for(var o=!1;;)switch(n){case"hex":return hexWrite(this,t,e,r);case"utf8":case"utf-8":return utf8Write(this,t,e,r);case"ascii":return asciiWrite(this,t,e,r);case"binary":return binaryWrite(this,t,e,r);case"base64":return base64Write(this,t,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return ucs2Write(this,t,e,r);default:if(o)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),o=!0}},Buffer.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var MAX_ARGUMENTS_LENGTH=4096;Buffer.prototype.slice=function(t,e){var r=this.length;t=~~t,e=void 0===e?r:~~e,0>t?(t+=r,0>t&&(t=0)):t>r&&(t=r),0>e?(e+=r,0>e&&(e=0)):e>r&&(e=r),t>e&&(e=t);var n;if(Buffer.TYPED_ARRAY_SUPPORT)n=Buffer._augment(this.subarray(t,e));else{var i=e-t;n=new Buffer(i,void 0);for(var f=0;i>f;f++)n[f]=this[f+t]}return n.length&&(n.parent=this.parent||this),n},Buffer.prototype.readUIntLE=function(t,e,r){t=0|t,e=0|e,r||checkOffset(t,e,this.length);for(var n=this[t],i=1,f=0;++f<e&&(i*=256);)n+=this[t+f]*i;return n},Buffer.prototype.readUIntBE=function(t,e,r){t=0|t,e=0|e,r||checkOffset(t,e,this.length);for(var n=this[t+--e],i=1;e>0&&(i*=256);)n+=this[t+--e]*i;return n},Buffer.prototype.readUInt8=function(t,e){return e||checkOffset(t,1,this.length),this[t]},Buffer.prototype.readUInt16LE=function(t,e){return e||checkOffset(t,2,this.length),this[t]|this[t+1]<<8},Buffer.prototype.readUInt16BE=function(t,e){return e||checkOffset(t,2,this.length),this[t]<<8|this[t+1]},Buffer.prototype.readUInt32LE=function(t,e){return e||checkOffset(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},Buffer.prototype.readUInt32BE=function(t,e){return e||checkOffset(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},Buffer.prototype.readIntLE=function(t,e,r){t=0|t,e=0|e,r||checkOffset(t,e,this.length);for(var n=this[t],i=1,f=0;++f<e&&(i*=256);)n+=this[t+f]*i;return i*=128,n>=i&&(n-=Math.pow(2,8*e)),n},Buffer.prototype.readIntBE=function(t,e,r){t=0|t,e=0|e,r||checkOffset(t,e,this.length);for(var n=e,i=1,f=this[t+--n];n>0&&(i*=256);)f+=this[t+--n]*i;return i*=128,f>=i&&(f-=Math.pow(2,8*e)),f},Buffer.prototype.readInt8=function(t,e){return e||checkOffset(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},Buffer.prototype.readInt16LE=function(t,e){e||checkOffset(t,2,this.length);var r=this[t]|this[t+1]<<8;return 32768&r?4294901760|r:r},Buffer.prototype.readInt16BE=function(t,e){e||checkOffset(t,2,this.length);var r=this[t+1]|this[t]<<8;return 32768&r?4294901760|r:r},Buffer.prototype.readInt32LE=function(t,e){return e||checkOffset(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},Buffer.prototype.readInt32BE=function(t,e){return e||checkOffset(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},Buffer.prototype.readFloatLE=function(t,e){return e||checkOffset(t,4,this.length),ieee754.read(this,t,!0,23,4)},Buffer.prototype.readFloatBE=function(t,e){return e||checkOffset(t,4,this.length),ieee754.read(this,t,!1,23,4)},Buffer.prototype.readDoubleLE=function(t,e){return e||checkOffset(t,8,this.length),ieee754.read(this,t,!0,52,8)},Buffer.prototype.readDoubleBE=function(t,e){return e||checkOffset(t,8,this.length),ieee754.read(this,t,!1,52,8)},Buffer.prototype.writeUIntLE=function(t,e,r,n){t=+t,e=0|e,r=0|r,n||checkInt(this,t,e,r,Math.pow(2,8*r),0);var i=1,f=0;for(this[e]=255&t;++f<r&&(i*=256);)this[e+f]=t/i&255;return e+r},Buffer.prototype.writeUIntBE=function(t,e,r,n){t=+t,e=0|e,r=0|r,n||checkInt(this,t,e,r,Math.pow(2,8*r),0);var i=r-1,f=1;for(this[e+i]=255&t;--i>=0&&(f*=256);)this[e+i]=t/f&255;return e+r},Buffer.prototype.writeUInt8=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,1,255,0),Buffer.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},Buffer.prototype.writeUInt16LE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,2,65535,0),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):objectWriteUInt16(this,t,e,!0),e+2},Buffer.prototype.writeUInt16BE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,2,65535,0),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):objectWriteUInt16(this,t,e,!1),e+2},Buffer.prototype.writeUInt32LE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,4,4294967295,0),Buffer.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):objectWriteUInt32(this,t,e,!0),e+4},Buffer.prototype.writeUInt32BE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,4,4294967295,0),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):objectWriteUInt32(this,t,e,!1),e+4},Buffer.prototype.writeIntLE=function(t,e,r,n){if(t=+t,e=0|e,!n){var i=Math.pow(2,8*r-1);checkInt(this,t,e,r,i-1,-i)}var f=0,o=1,u=0>t?1:0;for(this[e]=255&t;++f<r&&(o*=256);)this[e+f]=(t/o>>0)-u&255;return e+r},Buffer.prototype.writeIntBE=function(t,e,r,n){if(t=+t,e=0|e,!n){var i=Math.pow(2,8*r-1);checkInt(this,t,e,r,i-1,-i)}var f=r-1,o=1,u=0>t?1:0;for(this[e+f]=255&t;--f>=0&&(o*=256);)this[e+f]=(t/o>>0)-u&255;return e+r},Buffer.prototype.writeInt8=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,1,127,-128),Buffer.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),0>t&&(t=255+t+1),this[e]=255&t,e+1},Buffer.prototype.writeInt16LE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,2,32767,-32768),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):objectWriteUInt16(this,t,e,!0),e+2},Buffer.prototype.writeInt16BE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,2,32767,-32768),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):objectWriteUInt16(this,t,e,!1),e+2},Buffer.prototype.writeInt32LE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,4,2147483647,-2147483648),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):objectWriteUInt32(this,t,e,!0),e+4},Buffer.prototype.writeInt32BE=function(t,e,r){return t=+t,e=0|e,r||checkInt(this,t,e,4,2147483647,-2147483648),0>t&&(t=4294967295+t+1),Buffer.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):objectWriteUInt32(this,t,e,!1),e+4},Buffer.prototype.writeFloatLE=function(t,e,r){return writeFloat(this,t,e,!0,r)},Buffer.prototype.writeFloatBE=function(t,e,r){return writeFloat(this,t,e,!1,r)},Buffer.prototype.writeDoubleLE=function(t,e,r){return writeDouble(this,t,e,!0,r)},Buffer.prototype.writeDoubleBE=function(t,e,r){return writeDouble(this,t,e,!1,r)},Buffer.prototype.copy=function(t,e,r,n){if(r||(r=0),n||0===n||(n=this.length),e>=t.length&&(e=t.length),e||(e=0),n>0&&r>n&&(n=r),n===r)return 0;if(0===t.length||0===this.length)return 0;if(0>e)throw new RangeError("targetStart out of bounds");if(0>r||r>=this.length)throw new RangeError("sourceStart out of bounds");if(0>n)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-e<n-r&&(n=t.length-e+r);var i,f=n-r;if(this===t&&e>r&&n>e)for(i=f-1;i>=0;i--)t[i+e]=this[i+r];else if(1e3>f||!Buffer.TYPED_ARRAY_SUPPORT)for(i=0;f>i;i++)t[i+e]=this[i+r];else t._set(this.subarray(r,r+f),e);return f},Buffer.prototype.fill=function(t,e,r){if(t||(t=0),e||(e=0),r||(r=this.length),e>r)throw new RangeError("end < start");if(r!==e&&0!==this.length){if(0>e||e>=this.length)throw new RangeError("start out of bounds");if(0>r||r>this.length)throw new RangeError("end out of bounds");var n;if("number"==typeof t)for(n=e;r>n;n++)this[n]=t;else{var i=utf8ToBytes(t.toString()),f=i.length;for(n=e;r>n;n++)this[n]=i[n%f]}return this}},Buffer.prototype.toArrayBuffer=function(){if("undefined"!=typeof Uint8Array){if(Buffer.TYPED_ARRAY_SUPPORT)return new Buffer(this).buffer;for(var t=new Uint8Array(this.length),e=0,r=t.length;r>e;e+=1)t[e]=this[e];return t.buffer}throw new TypeError("Buffer.toArrayBuffer not supported in this browser")};var BP=Buffer.prototype;Buffer._augment=function(t){return t.constructor=Buffer,t._isBuffer=!0,t._set=t.set,t.get=BP.get,t.set=BP.set,t.write=BP.write,t.toString=BP.toString,t.toLocaleString=BP.toString,t.toJSON=BP.toJSON,t.equals=BP.equals,t.compare=BP.compare,t.indexOf=BP.indexOf,t.copy=BP.copy,t.slice=BP.slice,t.readUIntLE=BP.readUIntLE,t.readUIntBE=BP.readUIntBE,t.readUInt8=BP.readUInt8,t.readUInt16LE=BP.readUInt16LE,t.readUInt16BE=BP.readUInt16BE,t.readUInt32LE=BP.readUInt32LE,t.readUInt32BE=BP.readUInt32BE,t.readIntLE=BP.readIntLE,t.readIntBE=BP.readIntBE,t.readInt8=BP.readInt8,t.readInt16LE=BP.readInt16LE,t.readInt16BE=BP.readInt16BE,t.readInt32LE=BP.readInt32LE,t.readInt32BE=BP.readInt32BE,t.readFloatLE=BP.readFloatLE,t.readFloatBE=BP.readFloatBE,t.readDoubleLE=BP.readDoubleLE,t.readDoubleBE=BP.readDoubleBE,t.writeUInt8=BP.writeUInt8,t.writeUIntLE=BP.writeUIntLE,t.writeUIntBE=BP.writeUIntBE,t.writeUInt16LE=BP.writeUInt16LE,t.writeUInt16BE=BP.writeUInt16BE,t.writeUInt32LE=BP.writeUInt32LE,t.writeUInt32BE=BP.writeUInt32BE,t.writeIntLE=BP.writeIntLE,t.writeIntBE=BP.writeIntBE,t.writeInt8=BP.writeInt8,t.writeInt16LE=BP.writeInt16LE,t.writeInt16BE=BP.writeInt16BE,t.writeInt32LE=BP.writeInt32LE,t.writeInt32BE=BP.writeInt32BE,t.writeFloatLE=BP.writeFloatLE,t.writeFloatBE=BP.writeFloatBE,t.writeDoubleLE=BP.writeDoubleLE,t.writeDoubleBE=BP.writeDoubleBE,t.fill=BP.fill,t.inspect=BP.inspect,t.toArrayBuffer=BP.toArrayBuffer,t};var INVALID_BASE64_RE=/[^+\/0-9A-Za-z-_]/g;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":7,"ieee754":8,"is-array":9}],7:[function(_dereq_,module,exports){
var lookup="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";!function(t){"use strict";function r(t){var r=t.charCodeAt(0);return r===h||r===u?62:r===c||r===f?63:o>r?-1:o+10>r?r-o+26+26:i+26>r?r-i:A+26>r?r-A+26:void 0}function e(t){function e(t){i[f++]=t}var n,h,c,o,A,i;if(t.length%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var u=t.length;A="="===t.charAt(u-2)?2:"="===t.charAt(u-1)?1:0,i=new a(3*t.length/4-A),c=A>0?t.length-4:t.length;var f=0;for(n=0,h=0;c>n;n+=4,h+=3)o=r(t.charAt(n))<<18|r(t.charAt(n+1))<<12|r(t.charAt(n+2))<<6|r(t.charAt(n+3)),e((16711680&o)>>16),e((65280&o)>>8),e(255&o);return 2===A?(o=r(t.charAt(n))<<2|r(t.charAt(n+1))>>4,e(255&o)):1===A&&(o=r(t.charAt(n))<<10|r(t.charAt(n+1))<<4|r(t.charAt(n+2))>>2,e(o>>8&255),e(255&o)),i}function n(t){function r(t){return lookup.charAt(t)}function e(t){return r(t>>18&63)+r(t>>12&63)+r(t>>6&63)+r(63&t)}var n,a,h,c=t.length%3,o="";for(n=0,h=t.length-c;h>n;n+=3)a=(t[n]<<16)+(t[n+1]<<8)+t[n+2],o+=e(a);switch(c){case 1:a=t[t.length-1],o+=r(a>>2),o+=r(a<<4&63),o+="==";break;case 2:a=(t[t.length-2]<<8)+t[t.length-1],o+=r(a>>10),o+=r(a>>4&63),o+=r(a<<2&63),o+="="}return o}var a="undefined"!=typeof Uint8Array?Uint8Array:Array,h="+".charCodeAt(0),c="/".charCodeAt(0),o="0".charCodeAt(0),A="a".charCodeAt(0),i="A".charCodeAt(0),u="-".charCodeAt(0),f="_".charCodeAt(0);t.toByteArray=e,t.fromByteArray=n}("undefined"==typeof exports?this.base64js={}:exports);
},{}],8:[function(_dereq_,module,exports){
exports.read=function(a,o,t,r,h){var M,p,w=8*h-r-1,f=(1<<w)-1,e=f>>1,i=-7,N=t?h-1:0,n=t?-1:1,s=a[o+N];for(N+=n,M=s&(1<<-i)-1,s>>=-i,i+=w;i>0;M=256*M+a[o+N],N+=n,i-=8);for(p=M&(1<<-i)-1,M>>=-i,i+=r;i>0;p=256*p+a[o+N],N+=n,i-=8);if(0===M)M=1-e;else{if(M===f)return p?NaN:(s?-1:1)*(1/0);p+=Math.pow(2,r),M-=e}return(s?-1:1)*p*Math.pow(2,M-r)},exports.write=function(a,o,t,r,h,M){var p,w,f,e=8*M-h-1,i=(1<<e)-1,N=i>>1,n=23===h?Math.pow(2,-24)-Math.pow(2,-77):0,s=r?0:M-1,u=r?1:-1,l=0>o||0===o&&0>1/o?1:0;for(o=Math.abs(o),isNaN(o)||o===1/0?(w=isNaN(o)?1:0,p=i):(p=Math.floor(Math.log(o)/Math.LN2),o*(f=Math.pow(2,-p))<1&&(p--,f*=2),o+=p+N>=1?n/f:n*Math.pow(2,1-N),o*f>=2&&(p++,f/=2),p+N>=i?(w=0,p=i):p+N>=1?(w=(o*f-1)*Math.pow(2,h),p+=N):(w=o*Math.pow(2,N-1)*Math.pow(2,h),p=0));h>=8;a[t+s]=255&w,s+=u,w/=256,h-=8);for(p=p<<h|w,e+=h;e>0;a[t+s]=255&p,s+=u,p/=256,e-=8);a[t+s-u]|=128*l};
},{}],9:[function(_dereq_,module,exports){
var isArray=Array.isArray,str=Object.prototype.toString;module.exports=isArray||function(r){return!!r&&"[object Array]"==str.call(r)};
},{}],10:[function(_dereq_,module,exports){
(function (global){
!function(e){function o(e){throw RangeError(T[e])}function n(e,o){for(var n=e.length,r=[];n--;)r[n]=o(e[n]);return r}function r(e,o){var r=e.split("@"),t="";r.length>1&&(t=r[0]+"@",e=r[1]),e=e.replace(S,".");var u=e.split("."),i=n(u,o).join(".");return t+i}function t(e){for(var o,n,r=[],t=0,u=e.length;u>t;)o=e.charCodeAt(t++),o>=55296&&56319>=o&&u>t?(n=e.charCodeAt(t++),56320==(64512&n)?r.push(((1023&o)<<10)+(1023&n)+65536):(r.push(o),t--)):r.push(o);return r}function u(e){return n(e,function(e){var o="";return e>65535&&(e-=65536,o+=P(e>>>10&1023|55296),e=56320|1023&e),o+=P(e)}).join("")}function i(e){return 10>e-48?e-22:26>e-65?e-65:26>e-97?e-97:b}function f(e,o){return e+22+75*(26>e)-((0!=o)<<5)}function c(e,o,n){var r=0;for(e=n?M(e/j):e>>1,e+=M(e/o);e>L*C>>1;r+=b)e=M(e/L);return M(r+(L+1)*e/(e+m))}function l(e){var n,r,t,f,l,s,d,a,p,h,v=[],g=e.length,w=0,m=I,j=A;for(r=e.lastIndexOf(E),0>r&&(r=0),t=0;r>t;++t)e.charCodeAt(t)>=128&&o("not-basic"),v.push(e.charCodeAt(t));for(f=r>0?r+1:0;g>f;){for(l=w,s=1,d=b;f>=g&&o("invalid-input"),a=i(e.charCodeAt(f++)),(a>=b||a>M((x-w)/s))&&o("overflow"),w+=a*s,p=j>=d?y:d>=j+C?C:d-j,!(p>a);d+=b)h=b-p,s>M(x/h)&&o("overflow"),s*=h;n=v.length+1,j=c(w-l,n,0==l),M(w/n)>x-m&&o("overflow"),m+=M(w/n),w%=n,v.splice(w++,0,m)}return u(v)}function s(e){var n,r,u,i,l,s,d,a,p,h,v,g,w,m,j,F=[];for(e=t(e),g=e.length,n=I,r=0,l=A,s=0;g>s;++s)v=e[s],128>v&&F.push(P(v));for(u=i=F.length,i&&F.push(E);g>u;){for(d=x,s=0;g>s;++s)v=e[s],v>=n&&d>v&&(d=v);for(w=u+1,d-n>M((x-r)/w)&&o("overflow"),r+=(d-n)*w,n=d,s=0;g>s;++s)if(v=e[s],n>v&&++r>x&&o("overflow"),v==n){for(a=r,p=b;h=l>=p?y:p>=l+C?C:p-l,!(h>a);p+=b)j=a-h,m=b-h,F.push(P(f(h+j%m,0))),a=M(j/m);F.push(P(f(a,0))),l=c(r,w,u==i),r=0,++u}++r,++n}return F.join("")}function d(e){return r(e,function(e){return F.test(e)?l(e.slice(4).toLowerCase()):e})}function a(e){return r(e,function(e){return O.test(e)?"xn--"+s(e):e})}var p="object"==typeof exports&&exports&&!exports.nodeType&&exports,h="object"==typeof module&&module&&!module.nodeType&&module,v="object"==typeof global&&global;(v.global===v||v.window===v||v.self===v)&&(e=v);var g,w,x=2147483647,b=36,y=1,C=26,m=38,j=700,A=72,I=128,E="-",F=/^xn--/,O=/[^\x20-\x7E]/,S=/[\x2E\u3002\uFF0E\uFF61]/g,T={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},L=b-y,M=Math.floor,P=String.fromCharCode;if(g={version:"1.3.2",ucs2:{decode:t,encode:u},decode:l,encode:s,toASCII:a,toUnicode:d},"function"==typeof define&&"object"==typeof define.amd&&define.amd)define("punycode",function(){return g});else if(p&&h)if(module.exports==p)h.exports=g;else for(w in g)g.hasOwnProperty(w)&&(p[w]=g[w]);else e.punycode=g}(this);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],11:[function(_dereq_,module,exports){
"use strict";function hasOwnProperty(r,e){return Object.prototype.hasOwnProperty.call(r,e)}module.exports=function(r,e,t,n){e=e||"&",t=t||"=";var o={};if("string"!=typeof r||0===r.length)return o;var a=/\+/g;r=r.split(e);var s=1e3;n&&"number"==typeof n.maxKeys&&(s=n.maxKeys);var p=r.length;s>0&&p>s&&(p=s);for(var y=0;p>y;++y){var u,c,i,l,f=r[y].replace(a,"%20"),v=f.indexOf(t);v>=0?(u=f.substr(0,v),c=f.substr(v+1)):(u=f,c=""),i=decodeURIComponent(u),l=decodeURIComponent(c),hasOwnProperty(o,i)?isArray(o[i])?o[i].push(l):o[i]=[o[i],l]:o[i]=l}return o};var isArray=Array.isArray||function(r){return"[object Array]"===Object.prototype.toString.call(r)};
},{}],12:[function(_dereq_,module,exports){
"use strict";function map(r,e){if(r.map)return r.map(e);for(var t=[],n=0;n<r.length;n++)t.push(e(r[n],n));return t}var stringifyPrimitive=function(r){switch(typeof r){case"string":return r;case"boolean":return r?"true":"false";case"number":return isFinite(r)?r:"";default:return""}};module.exports=function(r,e,t,n){return e=e||"&",t=t||"=",null===r&&(r=void 0),"object"==typeof r?map(objectKeys(r),function(n){var i=encodeURIComponent(stringifyPrimitive(n))+t;return isArray(r[n])?map(r[n],function(r){return i+encodeURIComponent(stringifyPrimitive(r))}).join(e):i+encodeURIComponent(stringifyPrimitive(r[n]))}).join(e):n?encodeURIComponent(stringifyPrimitive(n))+t+encodeURIComponent(stringifyPrimitive(r)):""};var isArray=Array.isArray||function(r){return"[object Array]"===Object.prototype.toString.call(r)},objectKeys=Object.keys||function(r){var e=[];for(var t in r)Object.prototype.hasOwnProperty.call(r,t)&&e.push(t);return e};
},{}],13:[function(_dereq_,module,exports){
"use strict";exports.decode=exports.parse=_dereq_("./decode"),exports.encode=exports.stringify=_dereq_("./encode");
},{"./decode":11,"./encode":12}],14:[function(_dereq_,module,exports){
function Url(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}function urlParse(t,s,e){if(t&&isObject(t)&&t instanceof Url)return t;var h=new Url;return h.parse(t,s,e),h}function urlFormat(t){return isString(t)&&(t=urlParse(t)),t instanceof Url?t.format():Url.prototype.format.call(t)}function urlResolve(t,s){return urlParse(t,!1,!0).resolve(s)}function urlResolveObject(t,s){return t?urlParse(t,!1,!0).resolveObject(s):s}function isString(t){return"string"==typeof t}function isObject(t){return"object"==typeof t&&null!==t}function isNull(t){return null===t}function isNullOrUndefined(t){return null==t}var punycode=_dereq_("punycode");exports.parse=urlParse,exports.resolve=urlResolve,exports.resolveObject=urlResolveObject,exports.format=urlFormat,exports.Url=Url;var protocolPattern=/^([a-z0-9.+-]+:)/i,portPattern=/:[0-9]*$/,delims=["<",">",'"',"`"," ","\r","\n","	"],unwise=["{","}","|","\\","^","`"].concat(delims),autoEscape=["'"].concat(unwise),nonHostChars=["%","/","?",";","#"].concat(autoEscape),hostEndingChars=["/","?","#"],hostnameMaxLen=255,hostnamePartPattern=/^[a-z0-9A-Z_-]{0,63}$/,hostnamePartStart=/^([a-z0-9A-Z_-]{0,63})(.*)$/,unsafeProtocol={javascript:!0,"javascript:":!0},hostlessProtocol={javascript:!0,"javascript:":!0},slashedProtocol={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0},querystring=_dereq_("querystring");Url.prototype.parse=function(t,s,e){if(!isString(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var h=t;h=h.trim();var r=protocolPattern.exec(h);if(r){r=r[0];var o=r.toLowerCase();this.protocol=o,h=h.substr(r.length)}if(e||r||h.match(/^\/\/[^@\/]+@[^@\/]+/)){var a="//"===h.substr(0,2);!a||r&&hostlessProtocol[r]||(h=h.substr(2),this.slashes=!0)}if(!hostlessProtocol[r]&&(a||r&&!slashedProtocol[r])){for(var n=-1,i=0;i<hostEndingChars.length;i++){var l=h.indexOf(hostEndingChars[i]);-1!==l&&(-1===n||n>l)&&(n=l)}var c,u;u=-1===n?h.lastIndexOf("@"):h.lastIndexOf("@",n),-1!==u&&(c=h.slice(0,u),h=h.slice(u+1),this.auth=decodeURIComponent(c)),n=-1;for(var i=0;i<nonHostChars.length;i++){var l=h.indexOf(nonHostChars[i]);-1!==l&&(-1===n||n>l)&&(n=l)}-1===n&&(n=h.length),this.host=h.slice(0,n),h=h.slice(n),this.parseHost(),this.hostname=this.hostname||"";var p="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!p)for(var f=this.hostname.split(/\./),i=0,m=f.length;m>i;i++){var v=f[i];if(v&&!v.match(hostnamePartPattern)){for(var g="",y=0,d=v.length;d>y;y++)g+=v.charCodeAt(y)>127?"x":v[y];if(!g.match(hostnamePartPattern)){var P=f.slice(0,i),b=f.slice(i+1),j=v.match(hostnamePartStart);j&&(P.push(j[1]),b.unshift(j[2])),b.length&&(h="/"+b.join(".")+h),this.hostname=P.join(".");break}}}if(this.hostname.length>hostnameMaxLen?this.hostname="":this.hostname=this.hostname.toLowerCase(),!p){for(var O=this.hostname.split("."),q=[],i=0;i<O.length;++i){var x=O[i];q.push(x.match(/[^A-Za-z0-9_-]/)?"xn--"+punycode.encode(x):x)}this.hostname=q.join(".")}var U=this.port?":"+this.port:"",C=this.hostname||"";this.host=C+U,this.href+=this.host,p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==h[0]&&(h="/"+h))}if(!unsafeProtocol[o])for(var i=0,m=autoEscape.length;m>i;i++){var A=autoEscape[i],E=encodeURIComponent(A);E===A&&(E=escape(A)),h=h.split(A).join(E)}var w=h.indexOf("#");-1!==w&&(this.hash=h.substr(w),h=h.slice(0,w));var R=h.indexOf("?");if(-1!==R?(this.search=h.substr(R),this.query=h.substr(R+1),s&&(this.query=querystring.parse(this.query)),h=h.slice(0,R)):s&&(this.search="",this.query={}),h&&(this.pathname=h),slashedProtocol[o]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){var U=this.pathname||"",x=this.search||"";this.path=U+x}return this.href=this.format(),this},Url.prototype.format=function(){var t=this.auth||"";t&&(t=encodeURIComponent(t),t=t.replace(/%3A/i,":"),t+="@");var s=this.protocol||"",e=this.pathname||"",h=this.hash||"",r=!1,o="";this.host?r=t+this.host:this.hostname&&(r=t+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(r+=":"+this.port)),this.query&&isObject(this.query)&&Object.keys(this.query).length&&(o=querystring.stringify(this.query));var a=this.search||o&&"?"+o||"";return s&&":"!==s.substr(-1)&&(s+=":"),this.slashes||(!s||slashedProtocol[s])&&r!==!1?(r="//"+(r||""),e&&"/"!==e.charAt(0)&&(e="/"+e)):r||(r=""),h&&"#"!==h.charAt(0)&&(h="#"+h),a&&"?"!==a.charAt(0)&&(a="?"+a),e=e.replace(/[?#]/g,function(t){return encodeURIComponent(t)}),a=a.replace("#","%23"),s+r+e+a+h},Url.prototype.resolve=function(t){return this.resolveObject(urlParse(t,!1,!0)).format()},Url.prototype.resolveObject=function(t){if(isString(t)){var s=new Url;s.parse(t,!1,!0),t=s}var e=new Url;if(Object.keys(this).forEach(function(t){e[t]=this[t]},this),e.hash=t.hash,""===t.href)return e.href=e.format(),e;if(t.slashes&&!t.protocol)return Object.keys(t).forEach(function(s){"protocol"!==s&&(e[s]=t[s])}),slashedProtocol[e.protocol]&&e.hostname&&!e.pathname&&(e.path=e.pathname="/"),e.href=e.format(),e;if(t.protocol&&t.protocol!==e.protocol){if(!slashedProtocol[t.protocol])return Object.keys(t).forEach(function(s){e[s]=t[s]}),e.href=e.format(),e;if(e.protocol=t.protocol,t.host||hostlessProtocol[t.protocol])e.pathname=t.pathname;else{for(var h=(t.pathname||"").split("/");h.length&&!(t.host=h.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==h[0]&&h.unshift(""),h.length<2&&h.unshift(""),e.pathname=h.join("/")}if(e.search=t.search,e.query=t.query,e.host=t.host||"",e.auth=t.auth,e.hostname=t.hostname||t.host,e.port=t.port,e.pathname||e.search){var r=e.pathname||"",o=e.search||"";e.path=r+o}return e.slashes=e.slashes||t.slashes,e.href=e.format(),e}var a=e.pathname&&"/"===e.pathname.charAt(0),n=t.host||t.pathname&&"/"===t.pathname.charAt(0),i=n||a||e.host&&t.pathname,l=i,c=e.pathname&&e.pathname.split("/")||[],h=t.pathname&&t.pathname.split("/")||[],u=e.protocol&&!slashedProtocol[e.protocol];if(u&&(e.hostname="",e.port=null,e.host&&(""===c[0]?c[0]=e.host:c.unshift(e.host)),e.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===h[0]?h[0]=t.host:h.unshift(t.host)),t.host=null),i=i&&(""===h[0]||""===c[0])),n)e.host=t.host||""===t.host?t.host:e.host,e.hostname=t.hostname||""===t.hostname?t.hostname:e.hostname,e.search=t.search,e.query=t.query,c=h;else if(h.length)c||(c=[]),c.pop(),c=c.concat(h),e.search=t.search,e.query=t.query;else if(!isNullOrUndefined(t.search)){if(u){e.hostname=e.host=c.shift();var p=e.host&&e.host.indexOf("@")>0?e.host.split("@"):!1;p&&(e.auth=p.shift(),e.host=e.hostname=p.shift())}return e.search=t.search,e.query=t.query,isNull(e.pathname)&&isNull(e.search)||(e.path=(e.pathname?e.pathname:"")+(e.search?e.search:"")),e.href=e.format(),e}if(!c.length)return e.pathname=null,e.search?e.path="/"+e.search:e.path=null,e.href=e.format(),e;for(var f=c.slice(-1)[0],m=(e.host||t.host)&&("."===f||".."===f)||""===f,v=0,g=c.length;g>=0;g--)f=c[g],"."==f?c.splice(g,1):".."===f?(c.splice(g,1),v++):v&&(c.splice(g,1),v--);if(!i&&!l)for(;v--;v)c.unshift("..");!i||""===c[0]||c[0]&&"/"===c[0].charAt(0)||c.unshift(""),m&&"/"!==c.join("/").substr(-1)&&c.push("");var y=""===c[0]||c[0]&&"/"===c[0].charAt(0);if(u){e.hostname=e.host=y?"":c.length?c.shift():"";var p=e.host&&e.host.indexOf("@")>0?e.host.split("@"):!1;p&&(e.auth=p.shift(),e.host=e.hostname=p.shift())}return i=i||e.host&&c.length,i&&!y&&c.unshift(""),c.length?e.pathname=c.join("/"):(e.pathname=null,e.path=null),isNull(e.pathname)&&isNull(e.search)||(e.path=(e.pathname?e.pathname:"")+(e.search?e.search:"")),e.auth=t.auth||e.auth,e.slashes=e.slashes||t.slashes,e.href=e.format(),e},Url.prototype.parseHost=function(){var t=this.host,s=portPattern.exec(t);s&&(s=s[0],":"!==s&&(this.port=s.substr(1)),t=t.substr(0,t.length-s.length)),t&&(this.hostname=t)};
},{"punycode":10,"querystring":13}]},{},[1])(1)
});


//# sourceMappingURL=expandjs.min.map
Polymer.MatPalette = {

        /**
         * The material palettes.
         *
         * @property palettes
         * @type Object
         * @readonly
         */
        palettes: {
            light: {
                'amber': '#FFC107',
                'amber-50': '#FFF8E1',
                'amber-100': '#FFECB3',
                'amber-200': '#FFE082',
                'amber-300': '#FFD54F',
                'amber-400': '#FFCA28',
                'amber-500': '#FFC107',
                'amber-600': '#FFB300',
                'amber-700': '#FFA000',
                'amber-800': '#FF8F00',
                'amber-900': '#FF6F00',
                'amber-a100': '#FFE57F',
                'amber-a200': '#FFD740',
                'amber-a400': '#FFC400',
                'amber-a700': '#FFAB00',
                'blue-50': '#E3F2FD',
                'blue-100': '#BBDEFB',
                'blue-200': '#90CAF9',
                'blue-300': '#64B5F6',
                'blue-400': '#42A5F5',
                'blue-a100': '#82B1FF',
                'blue-grey-50': '#ECEFF1',
                'blue-grey-100': '#CFD8DC',
                'blue-grey-200': '#B0BEC5',
                'blue-grey-300': '#90A4AE',
                'brown-50': '#EFEBE9',
                'brown-100': '#D7CCC8',
                'brown-200': '#BCAAA4',
                'cyan-50': '#E0F7FA',
                'cyan-100': '#B2EBF2',
                'cyan-200': '#80DEEA',
                'cyan-300': '#4DD0E1',
                'cyan-400': '#26C6DA',
                'cyan-a100': '#84FFFF',
                'cyan-a200': '#18FFFF',
                'cyan-a400': '#00E5FF',
                'cyan-a700': '#00B8D4',
                'deep-orange-50': '#FBE9E7',
                'deep-orange-100': '#FFCCBC',
                'deep-orange-200': '#FFAB91',
                'deep-orange-300': '#FF8A65',
                'deep-orange-400': '#FF7043',
                'deep-orange-a100': '#FF9E80',
                'deep-orange-a200': '#FF6E40',
                'deep-purple-50': '#EDE7F6',
                'deep-purple-100': '#D1C4E9',
                'deep-purple-200': '#B39DDB',
                'deep-purple-a100': '#B388FF',
                'green-50': '#E8F5E9',
                'green-100': '#C8E6C9',
                'green-200': '#A5D6A7',
                'green-300': '#81C784',
                'green-400': '#66BB6A',
                'green-a100': '#B9F6CA',
                'green-a200': '#69F0AE',
                'green-a400': '#00E676',
                'green-a700': '#00C853',
                'grey': '#9E9E9E',
                'grey-50': '#FAFAFA',
                'grey-100': '#F5F5F5',
                'grey-200': '#EEEEEE',
                'grey-300': '#E0E0E0',
                'grey-400': '#BDBDBD',
                'grey-500': '#9E9E9E',
                'indigo-50': '#E8EAF6',
                'indigo-100': '#C5CAE9',
                'indigo-200': '#9FA8DA',
                'indigo-a100': '#8C9EFF',
                'light-blue-50': '#E1F5FE',
                'light-blue-100': '#B3E5FC',
                'light-blue-200': '#81D4FA',
                'light-blue-300': '#4FC3F7',
                'light-blue-400': '#29B6F6',
                'light-blue-a100': '#80D8FF',
                'light-blue-a200': '#40C4FF',
                'light-blue-a400': '#00B0FF',
                'light-green': '#8BC34A',
                'light-green-50': '#F1F8E9',
                'light-green-100': '#DCEDC8',
                'light-green-200': '#C5E1A5',
                'light-green-300': '#AED581',
                'light-green-400': '#9CCC65',
                'light-green-500': '#8BC34A',
                'light-green-600': '#7CB342',
                'light-green-700': '#689F38',
                'light-green-a100': '#CCFF90',
                'light-green-a200': '#B2FF59',
                'light-green-a400': '#76FF03',
                'light-green-a700': '#64DD17',
                'lime': '#CDDC39',
                'lime-50': '#F9FBE7',
                'lime-100': '#F0F4C3',
                'lime-200': '#E6EE9C',
                'lime-300': '#DCE775',
                'lime-400': '#D4E157',
                'lime-500': '#CDDC39',
                'lime-600': '#C0CA33',
                'lime-700': '#AFB42B',
                'lime-800': '#9E9D24',
                'lime-a100': '#F4FF81',
                'lime-a200': '#EEFF41',
                'lime-a400': '#C6FF00',
                'lime-a700': '#AEEA00',
                'orange': '#FF9800',
                'orange-50': '#FFF3E0',
                'orange-100': '#FFE0B2',
                'orange-200': '#FFCC80',
                'orange-300': '#FFB74D',
                'orange-400': '#FFA726',
                'orange-500': '#FF9800',
                'orange-600': '#FB8C00',
                'orange-700': '#F57C00',
                'orange-a100': '#FFD180',
                'orange-a200': '#FFAB40',
                'orange-a400': '#FF9100',
                'orange-a700': '#FF6D00',
                'pink-50': '#FCE4EC',
                'pink-100': '#F8BBD0',
                'pink-200': '#F48FB1',
                'pink-300': '#F06292',
                'pink-400': '#EC407A',
                'pink-a100': '#FF80AB',
                'purple-50': '#F3E5F5',
                'purple-100': '#E1BEE7',
                'purple-200': '#CE93D8',
                'purple-a100': '#EA80FC',
                'red-50': '#FFEBEE',
                'red-100': '#FFCDD2',
                'red-200': '#EF9A9A',
                'red-300': '#E57373',
                'red-400': '#EF5350',
                'red-a100': '#FF8A80',
                'teal-50': '#E0F2F1',
                'teal-100': '#B2DFDB',
                'teal-200': '#80CBC4',
                'teal-300': '#4DB6AC',
                'teal-400': '#26A69A',
                'teal-a100': '#A7FFEB',
                'teal-a200': '#64FFDA',
                'teal-a400': '#1DE9B6',
                'teal-a700': '#00BFA5',
                'white': '#FFFFFF',
                'yellow': '#FFEB3B',
                'yellow-50': '#FFFDE7',
                'yellow-100': '#FFF9C4',
                'yellow-200': '#FFF59D',
                'yellow-300': '#FFF176',
                'yellow-400': '#FFEE58',
                'yellow-500': '#FFEB3B',
                'yellow-600': '#FDD835',
                'yellow-700': '#FBC02D',
                'yellow-800': '#F9A825',
                'yellow-900': '#F57F17',
                'yellow-a100': '#FFFF8D',
                'yellow-a200': '#FFFF00',
                'yellow-a400': '#FFEA00',
                'yellow-a700': '#FFD600'
            },
            dark: {
                'black': '#000000',
                'blue': '#2196F3',
                'blue-500': '#2196F3',
                'blue-600': '#1E88E5',
                'blue-700': '#1976D2',
                'blue-800': '#1565C0',
                'blue-900': '#0D47A1',
                'blue-a200': '#448AFF',
                'blue-a400': '#2979FF',
                'blue-a700': '#2962FF',
                'blue-grey': '#607D8B',
                'blue-grey-400': '#78909C',
                'blue-grey-500': '#607D8B',
                'blue-grey-600': '#546E7A',
                'blue-grey-700': '#455A64',
                'blue-grey-800': '#37474F',
                'blue-grey-900': '#263238',
                'brown': '#795548',
                'brown-300': '#A1887F',
                'brown-400': '#8D6E63',
                'brown-500': '#795548',
                'brown-600': '#6D4C41',
                'brown-700': '#5D4037',
                'brown-800': '#4E342E',
                'brown-900': '#3E2723',
                'cyan': '#00BCD4',
                'cyan-500': '#00BCD4',
                'cyan-600': '#00ACC1',
                'cyan-700': '#0097A7',
                'cyan-800': '#00838F',
                'cyan-900': '#006064',
                'deep-orange': '#FF5722',
                'deep-orange-500': '#FF5722',
                'deep-orange-600': '#F4511E',
                'deep-orange-700': '#E64A19',
                'deep-orange-800': '#D84315',
                'deep-orange-900': '#BF360C',
                'deep-orange-a400': '#FF3D00',
                'deep-orange-a700': '#DD2C00',
                'deep-purple': '#673AB7',
                'deep-purple-300': '#9575CD',
                'deep-purple-400': '#7E57C2',
                'deep-purple-500': '#673AB7',
                'deep-purple-600': '#5E35B1',
                'deep-purple-700': '#512DA8',
                'deep-purple-800': '#4527A0',
                'deep-purple-900': '#311B92',
                'deep-purple-a200': '#7C4DFF',
                'deep-purple-a400': '#651FFF',
                'deep-purple-a700': '#6200EA',
                'green': '#4CAF50',
                'green-500': '#4CAF50',
                'green-600': '#43A047',
                'green-700': '#388E3C',
                'green-800': '#2E7D32',
                'green-900': '#1B5E20',
                'grey-600': '#757575',
                'grey-700': '#616161',
                'grey-800': '#424242',
                'grey-900': '#212121',
                'indigo': '#3F51B5',
                'indigo-300': '#7986CB',
                'indigo-400': '#5C6BC0',
                'indigo-500': '#3F51B5',
                'indigo-600': '#3949AB',
                'indigo-700': '#303F9F',
                'indigo-800': '#283593',
                'indigo-900': '#1A237E',
                'indigo-a200': '#536DFE',
                'indigo-a400': '#3D5AFE',
                'indigo-a700': '#304FFE',
                'light-blue': '#03A9F4',
                'light-blue-500': '#03A9F4',
                'light-blue-600': '#039BE5',
                'light-blue-700': '#0288D1',
                'light-blue-800': '#0277BD',
                'light-blue-900': '#01579B',
                'light-blue-a700': '#0091EA',
                'light-green-800': '#558B2F',
                'light-green-900': '#33691E',
                'lime-900': '#827717',
                'orange-800': '#EF6C00',
                'orange-900': '#E65100',
                'pink': '#E91E63',
                'pink-500': '#E91E63',
                'pink-600': '#D81B60',
                'pink-700': '#C2185B',
                'pink-800': '#AD1457',
                'pink-900': '#880E4F',
                'pink-a200': '#FF4081',
                'pink-a400': '#F50057',
                'pink-a700': '#C51162',
                'purple': '#9C27B0',
                'purple-300': '#BA68C8',
                'purple-400': '#AB47BC',
                'purple-500': '#9C27B0',
                'purple-600': '#8E24AA',
                'purple-700': '#7B1FA2',
                'purple-800': '#6A1B9A',
                'purple-900': '#4A148C',
                'purple-a200': '#E040FB',
                'purple-a400': '#D500F9',
                'purple-a700': '#AA00FF',
                'red': '#F44336',
                'red-500': '#F44336',
                'red-600': '#E53935',
                'red-700': '#D32F2F',
                'red-800': '#C62828',
                'red-900': '#B71C1C',
                'red-a200': '#FF5252',
                'red-a400': '#FF1744',
                'red-a700': '#D50000',
                'teal': '#009688',
                'teal-500': '#009688',
                'teal-600': '#00897B',
                'teal-700': '#00796B',
                'teal-800': '#00695C',
                'teal-900': '#004D40'
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeRGB: function (palette, disabled) {
            return (!disabled && (this.palettes.dark[palette || ''] || this.palettes.light[palette || ''])) || null;
        },

        // COMPUTER
        _computeForeground: function (palette, inverse) {
            return this.palettes.dark[palette || ''] || palette === 'dark' ? (inverse ? 'dark' : 'light') : (inverse ? 'light' : 'dark');
        }
    };
Polymer.XPSlaveBehavior = {

        /**
         * Fired when attached or detached.
         *
         * @event xp-slave
         * @param {Element} firer
         * @param {Function} coupler
         * @param {string} selector
         * @param {boolean} isAttached
         * @bubbles
         */

        /*********************************************************************/

        /**
         * Couples a master.
         *
         * @method _coupleMaster
         * @param {string} key
         * @param {Element} master
         * @returns {Element}
         * @private
         */
        _coupleMaster: function (key, master) {
            var self = this;
            if (!self[key]) { self[XP.setter(key, true)](master); }
            return (self[key] === master && master) || null;
        },

        /**
         * Decouples a master.
         *
         * @method _decoupleMaster
         * @param {string} key
         * @param {Element} master
         * @returns {Element}
         * @private
         */
        _decoupleMaster: function (key, master) {
            var self = this;
            if (self[key] === master) { self[XP.setter(key, true)](null); }
            return (!self[key] && master) || null;
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * A map used to bind masters to their respective css selector.
             *
             * @attribute masters-map
             * @type Object
             * @notifies
             * @readonly
             */
            mastersMap: {
                notify: true,
                readOnly: true,
                type: Object,
                value: function () { return {}; }
            }
        },

        /*********************************************************************/

        // LISTENER
        attached: function () {
            var self = this, fire = function (selector, key) { self.fire('xp-slave', {firer: self, couple: self._coupleMaster.bind(self, key), selector: selector, isAttached: true}); };
            self.async(function () { XP.forOwn(self.mastersMap, fire); });
        },

        // LISTENER
        detached: function () {
            var self = this, fire = function (selector, key) { if (self[key]) { self[key].fire('xp-slave', {firer: self, couple: self._decoupleMaster.bind(self, key), selector: selector, isAttached: false}); } };
            self.async(function () { XP.forOwn(self.mastersMap, fire); });
        }
    };
Polymer.MatInkBehaviorImp = {

        // OBSERVERS
        observers: [
            '_currentColorObserver(currentColor, disabled)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The ink's color.
             *
             * @attribute color
             * @type string
             */
            color: {
                observer: '_colorObserver',
                type: String
            },

            /**
             * The ink's current color.
             *
             * @attribute current-color
             * @type string
             * @readonly
             */
            currentColor: {
                readOnly: true,
                reflectToAttribute: true,
                type: String
            },

            /**
             * If set to true, the element is disabled.
             *
             * @attribute disabled
             * @type boolean
             * @default false
             */
            disabled: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The ink's foreground.
             *
             * @attribute foreground
             * @type "dark" | "light"
             * @default "dark"
             * @readonly
             */
            foreground: {
                computed: '_computeForeground(paper.foreground)',
                reflectToAttribute: true,
                type: String,
                value: "dark"
            },

            /**
             * If set to true, the element is hidden.
             *
             * @attribute hidden
             * @type boolean
             * @default false
             * @notifies
             */
            hidden: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The master paper.
             *
             * @attribute paper
             * @type Element
             * @readonly
             */
            paper: {
                readOnly: true
            },

            /**
             * The ink's opacity.
             *
             * @attribute opacity
             * @type string
             */
            opacity: {
                reflectToAttribute: true,
                type: String
            }
        },

        /**
         * The opacity list.
         *
         * @property opacityList
         * @type Array
         * @default ["divider", "hint", "icon", "secondary"]
         * @readonly
         */
        opacityList: ['divider', 'hint', 'icon', 'secondary'],

        /*********************************************************************/

        // COMPUTER
        _computeForeground: function () {
            return !!this.paper && this.paper.foreground;
        },

        /*********************************************************************/

        // OBSERVER
        _colorObserver: function () {

            // Setting
            this._setCurrentColor(this.color || null);
        },

        // OBSERVER
        _currentColorObserver: function () {

            // Styling
            this.style.color = this._computeRGB(this.currentColor, this.disabled) || '';
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('ink');
        },

        // LISTENER
        ready: function () {

            // Mapping
            this.mastersMap.paper = '.paper';
        }
    };

    Polymer.MatInkBehavior = [
        Polymer.XPSlaveBehavior,
        Polymer.MatPalette,
        Polymer.MatInkBehaviorImp
    ];
Polymer.XPIconsetFinder = {

        /**
         * Returns an iconset.
         *
         * @method findIconset
         * @param {string} name
         * @returns {Element}
         */
        findIconset: function (name) {

            // Asserting
            XP.assertArgument(XP.isVoid(name) || XP.isString(name), 1, 'string');

            // Finding
            return (name && this.icons[name]) || null;
        },

        /*********************************************************************/

        /**
         * The icons' sets.
         *
         * @property icons
         * @type Object
         * @default {}
         * @readonly
         */
        icons: {}
    };
Polymer.XPIconBehaviorImp = {

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_iconObserver(iconName, iconSet)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, the element is hidden.
             *
             * @attribute empty
             * @type boolean
             * @default true
             * @notifies
             * @readonly
             */
            empty: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: true
            },

            /**
             * The rendered icon's element.
             *
             * @attribute icon-element
             * @type Element
             * @readonly
             */
            iconElement: {
                notify: true,
                readOnly: true
            },

            /**
             * The rendered icon's name.
             *
             * @attribute icon-name
             * @type string
             * @notifies
             * @readonly
             */
            iconName: {
                notify: true,
                readOnly: true,
                type: String
            },

            /**
             * The rendered icon's set.
             *
             * @attribute icon-set
             * @type Element
             * @notifies
             * @readonly
             */
            iconSet: {
                notify: true,
                readOnly: true
            },

            /**
             * The icon's name.
             *
             * @attribute name
             * @type string
             * @default ""
             */
            name: {
                observer: '_nameObserver',
                reflectToAttribute: true,
                type: String,
                value: ''
            },

            /**
             * If set to true, the icon is rendered as `div` background instead of `svg`.
             *
             * @attribute raster
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            raster: {
                computed: '_computeRaster(src)',
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The icon's src.
             *
             * @attribute src
             * @type string
             */
            src: {
                observer: '_iconObserver',
                reflectToAttribute: true,
                type: String
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeRaster: function (src) {
            return !!src;
        },

        /*********************************************************************/

        // OBSERVER
        _iconObserver: function () {

            // Vars
            var self      = this,
                iconChild = self.src || !self.iconName || !self.iconSet ? null : self.iconSet.findIcon(self.iconName),
                iconNew   = self.src ? document.createElement('div') : iconChild && document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                iconTag   = self.src ? 'div' : iconChild && 'svg',
                iconOld   = Polymer.dom(self).children[0];

            // Appending
            if (iconChild) { iconNew.appendChild(iconChild); }

            // Setting
            self._setEmpty(!iconNew);
            self._setIconElement(iconNew);

            // CASE: svg
            if (iconTag === 'svg') {

                // Setting
                iconNew.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                iconNew.setAttribute('height', '24');
                iconNew.setAttribute('width', '24');
                iconNew.setAttribute('viewBox', '0 0 24 24');
            }

            // CASE: raster
            else if (iconTag) {

                // Styling
                iconNew.style.background = 'url(' + self.src + ') 100% no-repeat';
                iconNew.style.backgroundSize = '100% 100%';
            }

            // Replacing
            if (iconOld) { Polymer.dom(self).removeChild(iconOld); }
            if (iconNew) { Polymer.dom(self).appendChild(iconNew); }
        },

        // OBSERVER
        _nameObserver: function () {

            // Vars
            var self     = this,
                parts    = XP.split(self.name, ':'),
                iconName = parts[1],
                iconSet  = parts[0] && self.findIconset(parts[0]);

            // Setting
            self._setIconName(iconName || undefined);
            self._setIconSet(iconSet || undefined);

            // Listening
            self[iconSet ? 'unlisten' : 'listen'](window, 'xp-iconset', '_nameObserver');
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('icon');
        }
    };

    Polymer.XPIconBehavior = [
        Polymer.XPIconsetFinder,
        Polymer.XPIconBehaviorImp
    ];
Polymer.XPArrayBehavior = {

        /**
         * Adds a value at the end of an array, if it doesn't already exist,
         * and returns the passed element.
         *
         * @method append
         * @param {string} path
         * @param {*} value
         * @returns {*}
         */
        append: function (path, value) {

            // Asserting
            XP.assertArgument(XP.isString(path, true), 1, 'string');
            XP.assertOption(XP.isArray(this.get(path)), path, 'Array');

            // Vars
            var self  = this,
                array = self.get(path);

            // Appending
            if (array.indexOf(value) < 0) { self.push(path, value); }

            return value;
        },

        /**
         * Substitutes all items of `array` with ones from `other`, and returns the modified `array`.
         * The substitution happens only if necessary.
         *
         * @method overwrite
         * @param {string} path
         * @param {Array} other
         * @returns {Array}
         */
        overwrite: function (path, other) {

            // Asserting
            XP.assertArgument(XP.isString(path, true), 1, 'string');
            XP.assertArgument(XP.isArrayable(other), 2, 'Arrayable');
            XP.assertOption(XP.isArray(this.get(path)), path, 'Array');

            // Vars
            var self    = this,
                array   = self.get(path),
                differs = array.length !== other.length || XP.reduce(array, function (differs, val, i) { return differs || val !== other[i]; });

            // Overwriting
            if (differs) { self.splice.apply(self, XP.concat([path, 0, array.length], other)); }

            return array;
        },

        /**
         * Removes all instances of `value` from `array`.
         *
         * @method pull
         * @param {string} path
         * @param {*} [value]
         * @returns {Array}
         */
        pull: function (path, value) {

            // Asserting
            XP.assertArgument(XP.isString(path, true), 1, 'string');
            XP.assertOption(XP.isArray(this.get(path)), path, 'Array');

            // Vars
            var self  = this,
                array = self.get(path);

            // Pulling
            XP.forEachRight(array, function (val, i) { if (value === val) { self.splice(path, i, 1); } });

            return array;
        },

        /**
         * Removes an element from `array` corresponding to the given index and returns it.
         *
         * @method pullAt
         * @param {string} path
         * @param {number} index
         * @returns {*}
         */
        pullAt: function (path, index) {

            // Asserting
            XP.assertArgument(XP.isString(path, true), 1, 'string');
            XP.assertArgument(XP.isVoid(index) || XP.isIndex(index), 2, 'number');
            XP.assertOption(XP.isArray(this.get(path)), path, 'Array');

            // Vars
            var self  = this,
                array = self.get(path);

            // Pulling
            return index < array.length ? self.splice(path, index, 1)[0] : undefined;
        }
    };
Polymer.XPFocusedBehavior = {

        // LISTENERS
        listeners: {
            blur: '_blurHandler',
            focus: '_focusHandler'
        },

        // PROPERTIES
        properties: {

            /**
             * If set to true, the element is disabled.
             *
             * @attribute disabled
             * @type boolean
             * @default false
             * @notifies
             */
            disabled: {
                notify: true,
                observer: '_disabledObserver',
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the element is focused.
             *
             * @attribute focused
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            focused: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the element is hidden.
             *
             * @attribute hidden
             * @type boolean
             * @default false
             * @notifies
             */
            hidden: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /**
         * The last value of tabIndex.
         *
         * @property tabIndexLast
         * @type number
         * @default 0
         * @readonly
         */
        tabIndexLast: 0,

        /*********************************************************************/

        // OBSERVER
        _disabledObserver: function () {

            // Vars
            var self = this;

            // Focusing
            self._setFocused(self.focused && !self.disabled);

            // Setting
            self.tabIndexLast = self.disabled ? self.tabIndex : self.tabIndexLast;
            self.tabIndex     = self.disabled ? -1 : self.tabIndexLast;

            // Styling
            self.style.pointerEvents = self.disabled ? 'none' : '';
        },

        /*********************************************************************/

        // LISTENER
        mutated: function () {

            // Vars
            var self = this;

            // Setting
            self.tabIndex = self.disabled ? -1 : self.tabIndex || 0;

            // Observing
            XP.onMutation(self, Polymer.XPFocusedBehavior.mutated.bind(self), {attributes: true, attributeFilter: ['tabindex']});
        },

        // LISTENER
        ready: function () {

            // Mutating
            Polymer.XPFocusedBehavior.mutated.apply(this);
        },

        /*********************************************************************/

        // HANDLER
        _blurHandler: function () {
            this._setFocused(false);
        },

        // HANDLER
        _focusHandler: function () {
            this._setFocused(!this.disabled);
        }
    };
Polymer.XPRefirerBehavior = {

        /**
         * Notifies everyone in array.
         *
         * @method notifyAll
         * @param {string} pathAll
         * @param {string} path
         * @param {*} value
         */
        notifyAll: function (pathAll, path, value) {

            // Asserting
            XP.assertArgument(XP.isString(pathAll, true), 1, 'string');
            XP.assertArgument(XP.isString(path, true), 2, 'string');
            XP.assertOption(XP.isArray(this.get(pathAll)), pathAll, 'Array');

            // Vars
            var self     = this,
                elements = self.get(pathAll);

            // Notifying
            elements.forEach(function (element) { element.notifyPath(path, value); });
        },

        /**
         * Notifies a change event.
         *
         * @method notifyChange
         * @param {Event} event
         */
        notifyChange: function (event) {

            // Asserting
            XP.assertArgument(XP.isEvent(event), 1, 'Event');

            // Vars
            var self  = this,
                path  = event.detail.path,
                type  = event.detail.type,
                value = event.detail.value;

            // Notifying
            self.notifyPath(path ? path.replace(/\.#/g, '.', '.') : type.replace(/-changed$/, ''), value);
        },

        /**
         * Notifies everyone besides itself in array.
         *
         * @method notifyOthers
         * @param {string} pathOthers
         * @param {string} path
         * @param {*} value
         */
        notifyOthers: function (pathOthers, path, value) {

            // Asserting
            XP.assertArgument(XP.isString(pathOthers, true), 1, 'string');
            XP.assertArgument(XP.isString(path, true), 2, 'string');
            XP.assertOption(XP.isArray(this.get(pathOthers)), pathOthers, 'Array');

            // Vars
            var self     = this,
                elements = self.get(pathOthers);

            // Notifying
            elements.forEach(function (element) { return element !== self ? element.notifyPath(path, value) : undefined; });
        },

        /**
         * Refires an event.
         *
         * @method refire
         * @param {Event} event
         * @param {string} [type]
         * @param {Object} [detail]
         * @returns {Event}
         */
        refire: function (event, type, detail) {

            // Asserting
            XP.assertArgument(XP.isEvent(event), 1, 'Event');
            XP.assertArgument(XP.isVoid(type) || XP.isString(type, true), 2, 'string');
            XP.assertArgument(XP.isVoid(detail) || XP.isObject(detail), 3, 'Object');

            // Stopping
            event.stopPropagation();

            // Vars
            var fired = this.fire(type || event.type, XP.assign({}, event.detail, detail), {cancelable: event.cancelable});

            // Preventing
            if (fired.defaultPrevented) { event.preventDefault(); }

            return fired;
        }
    };
Polymer.XPTargeterBehavior = {

        /**
         * Finds the targeted element.
         *
         * @method findTarget
         * @returns {Element}
         */
        findTarget: function () {

            // Vars
            var self = this,
                root = self.domHost && Polymer.dom(self.domHost.root);

            // Finding
            if (XP.isElement(self.target)) { return self.target; }
            if (XP.isString(self.target, true) && root) { return root.querySelector('#' + self.target) || null; }
            if (XP.isString(self.target, true)) { return document.getElementById(self.target) || null; }

            return null;
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * The element's target.
             *
             * @attribute target
             * @type Element | string
             * @notifies
             */
            target: {
                notify: true,
                value: null
            }
        }
    };
(function () {

        // Prototype
        Polymer.XPPressedBehaviorImp = {

            /**
             * Fired when the active state changes.
             *
             * @event xp-active
             * @param {Element} firer
             * @param {boolean} isActive
             * @bubbles
             */

            /**
             * Fired when the element is clicked.
             *
             * @event xp-activate
             * @param {Element} firer
             * @param {Element} target
             * @param {*} data
             * @param {boolean} isActive
             * @bubbles
             * @cancelable
             */

            /*********************************************************************/

            /**
             * Makes the element pressed.
             *
             * @method press
             * @returns {Element}
             */
            press: function () {

                // Vars
                var self   = this,
                    target = self.target;

                // Finding
                if (self.behavior !== 'inject') { target = self.findTarget() || target; }

                // Firing
                if (self.fire('xp-activate', {firer: self, target: target, data: self.data, isActive: self.active}, {cancelable: true}).defaultPrevented) { return self; }

                // Setting
                if (self.toggleable)  { self.active   = !self.active; }
                if (self.autoDisable) { self.disabled = true; }

                // Checking
                if (!target) { return self; }

                // Scoping
                if (self.behavior === 'inject' && self.inject)   { self.inject(target, self.data); }
                if (self.behavior === 'reset'  && target.reset)  { target.reset(); }
                if (self.behavior === 'submit' && target.submit) { target.submit(self.data); }
                if (self.behavior === 'toggle' && target.toggle) { target.toggle(self, self.data); }

                return self;
            },

            /*********************************************************************/

            // LISTENERS
            listeners: {
                'click': '_clickHandler',
                'down': '_touchHandler',
                'up': '_touchHandler'
            },

            // PROPERTIES
            properties: {

                /**
                 * If set to true, the element is active.
                 *
                 * @attribute active
                 * @type boolean
                 * @default false
                 * @notifies
                 */
                active: {
                    notify: true,
                    observer: '_activeObserver',
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, pressing the element will disable it.
                 *
                 * @attribute auto-disable
                 * @type boolean
                 * @default false
                 */
                autoDisable: {
                    type: Boolean,
                    value: false
                },

                /**
                 * Determines how the element behaves in relation to its target.
                 *
                 * @attribute behavior
                 * @type "inject" | "reset" | "submit" | "toggle"
                 */
                behavior: {
                    type: String
                },

                /**
                 * The element's data.
                 *
                 * @attribute data
                 * @type *
                 * @notifies
                 */
                data: {
                    notify: true
                },

                /**
                 * If set to true, the element is pressed.
                 *
                 * @attribute pressed
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                pressed: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the element can't be pressed by tap.
                 *
                 * @attribute tap-disabled
                 * @type boolean
                 * @default false
                 */
                tapDisabled: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, pressing the element will toggle its active state.
                 *
                 * @attribute toggleable
                 * @type boolean
                 * @default false
                 */
                toggleable: {
                    observer: '_toggleableObserver',
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                }
            },

            /*********************************************************************/

            // OBSERVER
            _activeObserver: function () {

                // Firing
                this.fire('xp-active', {firer: this, isActive: this.active});
            },

            // OBSERVER
            _toggleableObserver: function () {

                // Setting
                if (!this.toggleable) { this.active = false; }
            },

            /*********************************************************************/

            // HANDLER
            _clickHandler: function (event) {

                // Vars
                var self = this;

                // Preventing
                if (!event.button) { event.pressed = event.pressed || self; }

                // Pressing
                if (event.pressed === self) { self.press(); }
            },

            // HANDLER
            _touchHandler: function (event) {

                // Vars
                var self = this;

                // Preventing
                event.pressed = event.pressed || self;

                // Setting
                if (event.pressed === self) { self._setPressed(event.type === 'down'); }
            }
        };

        Polymer.XPPressedBehavior = [
            Polymer.XPArrayBehavior,
            Polymer.XPFocusedBehavior,
            Polymer.XPRefirerBehavior,
            Polymer.XPTargeterBehavior,
            Polymer.XPPressedBehaviorImp
        ];
    }());
Polymer.MatPressedBehaviorImp = {

        /**
         * Ripples a wave.
         *
         * @method _ripple
         * @param {number} [startX]
         * @param {number} [startY]
         * @returns {Element}
         * @private
         */
        _ripple: function (startX, startY) {

            // Vars
            var self      = this,
                root      = Polymer.dom(self.root),
                waves     = Polymer.dom(root.querySelector('.ripple-waves')),
                ground    = root.querySelector('.ripple-ground'),
                wave      = waves.appendChild(document.createElement('div')),
                boundings = XP.getBoundings(self),
                centerX   = XP.isVoid(startX) || !ground,
                centerY   = XP.isVoid(startY) || !ground,
                data      = {};

            // Setting
            self.tsRipple = Date.now();

            // Calculating
            data.radius = Math.floor(Math.max(boundings.width, boundings.height)) * 1.5;
            data.left   = (centerX ? (boundings.width / 2) : Math.max(startX, boundings.left) - Math.min(startX, boundings.left)) - (data.radius / 2);
            data.top    = (centerY ? (boundings.height / 2) : Math.max(startY, boundings.top) - Math.min(startY, boundings.top)) - (data.radius / 2);
            data.dx     = (boundings.width / 2) - data.left - (data.radius / 2);
            data.dy     = (boundings.height / 2) - data.top - (data.radius / 2);

            // Styling
            wave.style.height = data.radius + 'px';
            wave.style.top    = data.top + 'px';
            wave.style.left   = data.left + 'px';
            wave.style.width  = data.radius + 'px';

            // Classifying
            if (ground) { ground.classList.add('rippling'); }
            waves.classList.add('rippling');
            wave.classList.add('rippling');

            // Frame 1
            requestAnimationFrame(function () {

                // Styling
                wave.style.transform = 'translate(' + data.dx + 'px, ' + data.dy + 'px) scale(1)';

                // Smoothing
                if (!self.pressed) { self._smooth(); }
            });

            return self;
        },

        /**
         * Smooths a wave.
         *
         * @method _smooth
         * @param {boolean} [force = false]
         * @returns {Element}
         * @private
         */
        _smooth: function (force) {

            // Vars
            var self    = this,
                elapsed = Date.now() - self.tsRipple,
                root    = Polymer.dom(self.root),
                waves   = Polymer.dom(root.querySelector('.ripple-waves')),
                ground  = root.querySelector('.ripple-ground'),
                wave    = waves.querySelector('.rippling'),
                last    = waves.querySelectorAll('.rippling').length < 2;

            // Checking
            if (!wave) { return self; }

            // Delaying
            if (!force && elapsed < 250) { return self.async(self._smooth.bind(self, true), 250 - elapsed); }

            // Classifying
            if (ground && last) { ground.classList.remove('rippling'); }
            wave.classList.remove('rippling');
            wave.classList.add('smoothing');

            // Delaying
            self.async(function () { return waves.removeChild(wave) && (waves.children.length || waves.classList.remove('rippling')); }, 540);

            return self;
        },

        /*********************************************************************/

        /**
         * The last ripple timestamp.
         *
         * @property tsRipple
         * @type number
         * @default 0
         * @readonly
         */
        tsRipple: 0,

        /*********************************************************************/

        // HANDLER
        _touchHandler: function (event) {

            // Vars
            var self = this;

            // Super
            Polymer.XPPressedBehaviorImp._touchHandler.apply(self, arguments);

            // Checking
            if (event.pressed !== self) { return; }

            // Rippling
            if (self.pressed) { self._ripple(event.detail.x, event.detail.y); } else { self._smooth(); }
        }
    };

    Polymer.MatPressedBehavior = [
        Polymer.XPPressedBehavior,
        Polymer.MatPressedBehaviorImp
    ];
Polymer.MatPressedInkBehaviorImp = {

        // OBSERVERS
        observers: [
            '_colorObserver(active, activeColor)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The ink's active color.
             *
             * @attribute active-color
             * @type string
             */
            activeColor: {
                type: String
            }
        },

        /*********************************************************************/

        // OBSERVER
        _colorObserver: function () {

            // Setting
            this._setCurrentColor((this.active && this.activeColor) || this.color || null);
        }
    };

    Polymer.MatPressedInkBehavior = [
        Polymer.MatInkBehavior,
        Polymer.MatPressedBehavior,
        Polymer.MatPressedInkBehaviorImp
    ];
Polymer.XPAnchorBehavior = {

        /**
         * Fired when the anchor is clicked.
         *
         * @event xp-redirect
         * @param {Element} firer
         * @param {string} href
         * @bubbles
         * @cancelable
         */

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_anchorObserver(anchor, download, href, rel, target)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The element's anchor.
             *
             * @attribute anchor
             * @type Element
             * @notifies
             * @readonly
             */
            anchor: {
                notify: true,
                readOnly: true
            },

            /**
             * The anchor's download property's value.
             *
             * @attribute download
             * @type string
             */
            download: {
                reflectToAttribute: true,
                type: String,
                value: null
            },

            /**
             * The anchor's href property's value.
             *
             * @attribute href
             * @type string
             */
            href: {
                reflectToAttribute: true,
                type: String,
                value: null
            },

            /**
             * The anchor's rel property's value.
             *
             * @attribute rel
             * @type string
             */
            rel: {
                reflectToAttribute: true,
                type: String,
                value: null
            },

            /**
             * The anchor's target property's value.
             *
             * @attribute target
             * @type Element | string
             * @notifies
             */
            target: {
                notify: true,
                value: null
            }
        },

        /*********************************************************************/

        // OBSERVER
        _anchorObserver: function () {

            // Vars
            var self = this;

            // Setting
            XP.setAttribute(self.anchor, 'download', self.href && self.download);
            XP.setAttribute(self.anchor, 'href', self.href);
            XP.setAttribute(self.anchor, 'rel', self.href && self.rel);
            XP.setAttribute(self.anchor, 'target', self.href && self.target);
        },

        /*********************************************************************/

        // LISTENER
        ready: function () {

            // Setting
            this._setAnchor(this.anchor || Polymer.dom(this.root).querySelector('.anchor'));
        },

        /*********************************************************************/

        // HANDLER
        _anchorHandler: function (event) {

            // Vars
            var self = this;

            // Checking
            if (event.button || self.anchor !== event.currentTarget || !self.anchor.href) { return; }

            // Firing
            if (self.fire('xp-redirect', {firer: self, anchor: self.anchor, href: self.anchor.href}, {cancelable: true}).defaultPrevented) { event.preventDefault(); }
        }
    };
Polymer.XPOverlayInjector = {

        /**
         * Injects the overlay.
         *
         * @method inject
         * @param {Element | string} element
         * @param {*} [data]
         * @param {Element} [host]
         */
        inject: function (element, data, host) {

            // Asserting
            XP.assertArgument(XP.isElement(element) || XP.isString(element, true), 1, 'Element or string');
            XP.assertArgument(XP.isVoid(host) || XP.isElement(host), 3, 'Element');

            // Vars
            var self     = this,
                shell    = XP.findParentElement(self, '.shell') || document.body,
                post     = XP.isString(element) ? document.createElement(element = element.toLowerCase()) : element,
                pre      = XP.isString(element) ? Polymer.dom(shell.root || shell).querySelector(element) : null,
                listener = XP.debounce(function () { return !post.showed && Polymer.dom(Polymer.dom(post).parentNode).removeChild(XP.unlisten(post, 'showed-changed', listener)); }, 500);

            // Hiding
            if (pre && pre !== post) { pre.hide(); }

            // Appending
            if (pre !== post) { Polymer.dom(shell.root || shell).appendChild(post); }

            // Listening
            if (pre !== post) { XP.listen(post, 'showed-changed', listener); }

            // Showing
            requestAnimationFrame(function () { requestAnimationFrame(post.show.bind(post, self, data || self.data)); });

            return post;
        }
    };
Polymer.XPMasterBehaviorImp = {

        /**
         * Couples a slave.
         *
         * @method _coupleSlave
         * @param {string} key
         * @param {Element} slave
         * @returns {Element}
         * @private
         */
        _coupleSlave: function (key, slave) {
            var self = this;
            if (!self[key]) { self[XP.setter(key, true)]([]); }
            return self.append(key, slave);
        },

        /**
         * Decouples a slave.
         *
         * @method _decoupleSlave
         * @param {string} key
         * @param {Element} slave
         * @returns {Element}
         * @private
         */
        _decoupleSlave: function (key, slave) {
            var self = this, index = XP.indexOf(self[key] || [], slave);
            return index >= 0 ? self.pullAt(key, index) : null;
        },

        /*********************************************************************/

        // LISTENERS
        listeners: {
            'xp-slave': '_slaveHandler'
        },

        // PROPERTIES
        properties: {

            /**
             * A map used to bind slaves arrays to their respective css selector.
             *
             * @attribute slaves-map
             * @type Object
             * @notifies
             * @readonly
             */
            slavesMap: {
                notify: true,
                readOnly: true,
                type: Object,
                value: function () { return {}; }
            }
        },

        /*********************************************************************/

        // HANDLER
        _slaveHandler: function (event) {

            // Vars
            var self       = this,
                couple     = event.detail.couple,
                isAttached = event.detail.isAttached,
                selector   = event.detail.selector,
                slave      = event.detail.firer,
                matches    = couple && selector && slave && self !== slave && XP.matches(self, selector),
                property   = matches && XP.findKey(self.slavesMap, function (value) { return XP.matches(slave, value); });

            // Stopping
            if (property) { event.stopPropagation(); } else { return; }

            // Coupling
            if (self[isAttached ? '_coupleSlave' : '_decoupleSlave'](property, slave)) { couple(self); }
        }
    };

    Polymer.XPMasterBehavior = [
        Polymer.XPArrayBehavior,
        Polymer.XPMasterBehaviorImp
    ];
Polymer.MatPaperBehaviorImp = {

        // OBSERVERS
        observers: [
            '_currentBackgroundObserver(currentBackground, disabled)',
            '_brightnessObserver(brightness, disabled, theme)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The paper's background.
             *
             * @attribute background
             * @type string
             */
            background: {
                observer: '_backgroundObserver',
                type: String
            },

            /**
             * The paper's brightness.
             *
             * @attribute brightness
             * @type string
             */
            brightness: {
                reflectToAttribute: true,
                type: String,
                value: null
            },

            /**
             * The paper's current background.
             *
             * @attribute current-background
             * @type string
             * @readonly
             */
            currentBackground: {
                observer: '_brightnessObserver',
                readOnly: true,
                reflectToAttribute: true,
                type: String
            },

            /**
             * If set to true, the element is disabled.
             *
             * @attribute disabled
             * @type boolean
             * @default false
             */
            disabled: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The paper's foreground.
             *
             * @attribute foreground
             * @type "dark" | "light"
             * @readonly
             */
            foreground: {
                observer: '_foregroundObserver',
                readOnly: true,
                reflectToAttribute: true,
                type: String
            },

            /**
             * If set to true, the element is hidden.
             *
             * @attribute hidden
             * @type boolean
             * @default false
             * @notifies
             */
            hidden: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The slave inks.
             *
             * @attribute inks
             * @type Array
             * @readonly
             */
            inks: {
                readOnly: true,
                value: function () { return []; }
            },

            /**
             * The master paper.
             *
             * @attribute paper
             * @type Element
             * @readonly
             */
            paper: {
                observer: '_paperObserver',
                readOnly: true
            },

            /**
             * The slave papers.
             *
             * @attribute papers
             * @type Array
             * @readonly
             */
            papers: {
                readOnly: true,
                value: function () { return []; }
            },

            /**
             * The paper's theme.
             *
             * @attribute theme
             * @type "dark" | "light"
             */
            theme: {
                observer: '_themeObserver',
                type: String
            },

            /**
             * The paper's z-axis position.
             *
             * @attribute z
             * @type number
             */
            z: {
                reflectToAttribute: true,
                type: Number
            }
        },

        /**
         * The brightness list.
         *
         * @property brightnessList
         * @type Array
         * @default ["backdrop", "overlay", "placeholder", "toolbar", "transparent"]
         * @readonly
         */
        brightnessList: ['backdrop', 'overlay', 'placeholder', 'toolbar', 'transparent'],

        /*********************************************************************/

        // COMPUTER
        _computeInverse: function (background, brightness, disabled) {
            return brightness === 'placeholder' && !background && !disabled;
        },

        // COMPUTER
        _computePalette: function (background, brightness, disabled, theme) {
            return (!disabled && background) || (brightness !== 'overlay' && theme) || 'light';
        },

        /*********************************************************************/

        // OBSERVER
        _backgroundObserver: function () {

            // Setting
            this._setCurrentBackground(this.background || null);
        },

        // OBSERVER
        _brightnessObserver: function () {

            // Vars
            var self    = this,
                inverse = self._computeInverse(self.currentBackground, self.brightness, self.disabled),
                palette = self._computePalette(self.currentBackground, self.brightness, self.disabled, self.theme);

            // Setting
            self._setForeground(self._computeForeground(palette, inverse));
        },

        // OBSERVER
        _currentBackgroundObserver: function () {

            // Styling
            this.style.background = this._computeRGB(this.currentBackground, this.disabled) || '';
        },

        // OBSERVER
        _foregroundObserver: function () {

            // Setting
            this.async(this.notifyAll.bind(this, 'inks', 'paper.foreground', this.foreground));
        },

        // OBSERVER
        _paperObserver: function () {

            // Setting
            if (this.paper && !this.theme) { this.theme = this.paper.theme; }
        },

        // OBSERVER
        _themeObserver: function (post, pre) {

            // Checking
            if (this.papers) { this.papers.forEach(function (paper) { if (paper.theme === pre) { paper.theme = post; } }); }
        },

        /*********************************************************************/

        // LISTENER
        attached: function () {

            // Vars
            var self = this;

            // Setting
            self.async(function () { self.theme = self.theme || 'light'; });
        },

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('paper');
        },

        // LISTENER
        ready: function () {

            // Vars
            var self = this;

            // Mapping
            self.mastersMap.paper = '.paper';
            self.slavesMap.papers = '.paper';
            self.slavesMap.inks   = '.ink';
        }
    };

    Polymer.MatPaperBehavior = [
        Polymer.XPMasterBehavior,
        Polymer.XPRefirerBehavior,
        Polymer.XPSlaveBehavior,
        Polymer.MatPalette,
        Polymer.MatPaperBehaviorImp
    ];
Polymer.XPOverlayBehaviorImp = {

        /**
         * Fired on hide.
         *
         * @event xp-hide
         * @param {Element} firer
         */

        /**
         * Fired on show.
         * @event xp-show
         * @param {Element} firer
         */

        /*********************************************************************/

        /**
         * Aligns the overlay.
         *
         * @method align
         * @returns {Element}
         */
        align: function () {

            // Vars
            var self = this, target = self.showed && self.findTarget();

            // Aligning
            if (target) { self.async(XP.alignElement.bind(null, self, target, self.position, self.autoCenter)); } else { self.hide(); }

            return self;
        },

        /**
         * Hides the overlay.
         *
         * @method hide
         * @returns {Element}
         */
        hide: function () {

            // Vars
            var self = this;

            // Setting
            self.showed = false;

            return self;
        },

        /**
         * Shows the overlay.
         *
         * @method show
         * @param {Element | string} [target]
         * @param {*} [data]
         * @returns {Element}
         */
        show: function (target, data) {

            // Asserting
            XP.assertArgument(XP.isVoid(target) || XP.isElement(target) || XP.isString(target), 1, 'Element or string');

            // Vars
            var self = this;

            // Setting
            self.data   = data || self.data;
            self.target = target || self.target;
            self.showed = true;

            return self;
        },

        /**
         * Toggles the overlay.
         *
         * @method toggle
         * @param {Element | string} target
         * @param {*} [data]
         * @returns {Element}
         */
        toggle: function (target, data) {

            // Vars
            var self = this;

            // Toggling
            self[self.showed ? 'hide' : 'show'](target, data);

            return self;
        },

        /*********************************************************************/

        // OBSERVERS
        observers: [
            'align(autoCenter, position, showed, target)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, the overlay is center aligned.
             *
             * @attribute auto-center
             * @type boolean
             * @default false
             */
            autoCenter: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, clicking outside will not close the overlay.
             *
             * @attribute auto-hide-disabled
             * @type boolean
             * @default false
             */
            autoHideDisabled: {
                type: Boolean,
                value: false
            },

            /**
             * The overlay's data.
             *
             * @attribute data
             * @type *
             * @notifies
             */
            data: {
                notify: true
            },

            /**
             * The overlay position relative to the target.
             *
             * 'over' is over the target.
             *
             * 'aside' is to the side of the target.
             *
             * 'baseline' is underneath the target.
             *
             * @attribute position
             * @type "aside" | "baseline" | "over"
             * @default "over"
             */
            position: {
                type: String,
                value: "over"
            },

            /**
             * If set to true, the overlay is showed.
             *
             * @attribute showed
             * @type boolean
             * @default false
             * @notifies
             */
            showed: {
                notify: true,
                observer: '_showedObserver',
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /**
         * The list of positions.
         *
         * @property positions
         * @type Array
         * @default ["aside", "baseline", "over"]
         * @readonly
         */
        positions: ['aside', 'baseline', 'over'],

        /*********************************************************************/

        // OBSERVER
        _showedObserver: function () {

            // Vars
            var self   = this,
                method = self.showed ? 'listen' : 'unlisten';

            // Firing
            if (self.isAttached) { self.fire(self.showed ? 'xp-show' : 'xp-hide', {firer: self}); }

            // Frame 1
            requestAnimationFrame(function () {

                // Listening
                self[method](self, 'click', '_pushHandler');
                self[method](window, 'click', '_hideHandler');
                self[method](window, 'keyup', '_hideHandler');
                self[method](window, 'resize', '_resizeHandler');
            });
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Vars
            var self = this;

            // Classifying
            self.classList.add('overlay');

            // Binding
            self._hideHandler   = self._hideHandler.bind(self);
            self._pushHandler   = self._pushHandler.bind(self);
            self._resizeHandler = self._resizeHandler.bind(self);
        },

        /*********************************************************************/

        // HANDLER
        _hideHandler: function (event) {

            // Vars
            var self = this;

            // Frame 2
            requestAnimationFrame(function () {

                // Checking
                if (event.overlays && event.overlays.indexOf(self) >= 0) { return; }
                if (event.keyCode !== 27 && (event.button || event.keyCode || self.autoHideDisabled)) { return; }

                // Unlistening
                self.unlisten(self, 'click', '_pushHandler');
                self.unlisten(window, 'click', '_hideHandler');
                self.unlisten(window, 'keyup', '_hideHandler');
                self.unlisten(window, 'resize', '_resizeHandler');

                // Hiding
                self.hide();
            });
        },

        // HANDLER
        _pushHandler: function (event) {

            // Pushing
            (event.overlays = event.overlays || []).push(this);
        },

        // HANDLER
        _resizeHandler: function () {

            // Aligning
            this.align();
        }
    };

    Polymer.XPOverlayBehavior = [
        Polymer.XPTargeterBehavior,
        Polymer.XPOverlayBehaviorImp
    ];
Polymer.XPDialogBehaviorImp = {

        /**
         * Aligns the overlay.
         *
         * @method align
         * @returns {Element}
         */
        align: function () {

            // Vars
            var self = this;

            // Aligning
            if (self.showed) { self.async(XP.alignElement.bind(null, self)); }

            return self;
        },

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_sizeObserver(fullScreen, height, width)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, the dialog's backdrop is transparent.
             *
             * @attribute backdrop-disabled
             * @type boolean
             * @default false
             */
            backdropDisabled: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the dialog is full screen.
             *
             * @attribute full-screen
             * @type boolean
             * @default false
             */
            fullScreen: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The dialog's height. If `0` the dialog will resize itself based on it's content.
             *
             * @attribute height
             * @type number
             * @default 0
             */
            height: {
                reflectToAttribute: true,
                type: Number,
                value: 0
            },

            /**
             * The dialog's width. If `0` the dialog will resize itself based on it's content.
             *
             * @attribute width
             * @type number
             * @default 0
             */
            width: {
                reflectToAttribute: true,
                type: Number,
                value: 0
            }
        },

        /*********************************************************************/

        // OBSERVER
        _sizeObserver: function () {

            // Vars
            var self   = this,
                margin = XP.getMargin(self);

            // Stylizing
            self.style.height    = self.height && !self.fullScreen ? 'calc(100% - ' + (margin.top + margin.bottom) + 'px)' : '';
            self.style.margin    = self.fullScreen ? '0' : '';
            self.style.maxHeight = self.height && !self.fullScreen ? self.height + 'px' : '';
            self.style.maxWidth  = self.width && !self.fullScreen ? self.width + 'px' : '';
            self.style.width     = self.width && !self.fullScreen ? 'calc(100% - ' + (margin.left + margin.right) + 'px)' : '';

            // Aligning
            self.align();

            return self;
        },

        /*********************************************************************/

        // LISTENER
        attached: function () {

            // Resizing
            this._sizeObserver();
        },

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('dialog');
        },

        /*********************************************************************/

        // HANDLER
        _backdropHandler: function (event) {

            // Hiding
            if (!event.button && !this.autoHideDisabled) { this.hide(); }
        }
    };

    Polymer.XPDialogBehavior = [
        Polymer.XPOverlayBehavior,
        Polymer.XPDialogBehaviorImp
    ];
Polymer({

        // ELEMENT
        is: 'xp-media-query',

        /*********************************************************************/

        /**
         * Fired when the query's match state changes.
         *
         * @event xp-media-change
         * @param {Element} firer
         * @param {boolean} matched
         * @bubbles
         */

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * The media query's data.
             *
             * @attribute data
             * @type *
             * @notifies
             */
            data: {
                notify: true
            },

            /**
             * The media query's matcher.
             *
             * @attribute matcher
             * @type Object
             * @notifies
             * @readonly
             */
            matcher: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the current media query is matched.
             *
             * @attribute matched
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            matched: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The CSS media query to evaluate.
             *
             * @attribute query
             * @type string
             */
            query: {
                observer: '_queryChanged',
                type: String
            }
        },

        /*********************************************************************/

        // OBSERVER
        _queryChanged: function() {

            // Vars
            var self    = this,
                matcher = self.matcher;

            // Setting
            self._setMatcher(window.matchMedia(self.query));

            // Listening
            if (matcher) { matcher.removeListener(self._handleQuery); }
            if (self.matcher) { self.matcher.addListener(self._handleQuery); }

            // Handling
            self._handleQuery(self.matcher);
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Vars
            var self = this;

            // Classifying
            self.classList.add('media-query');

            // Binding
            self._handleQuery = self._handleQuery.bind(self);
        },

        /*********************************************************************/

        // HANDLER
        _handleQuery: function (event) {

            // Vars
            var self = this;

            // Setting
            self._setMatched(event.matches);

            // Firing
            XP.delay(self.fire.bind(self, 'xp-media-change', {firer: self, matched: self.matched}));
        }
    });
Polymer.XPInputBehaviorImp = {

        /**
         * Fired when the input's model changes.
         *
         * @event xp-input-change
         * @param {Element} firer
         * @param {string} name
         * @param {*} model
         * @bubbles
         */

        /**
         * Fired when the input's attributes change.
         *
         * @event xp-input-update
         * @param {Element} firer
         * @param {string} name
         * @bubbles
         */

        /**
         * Fired when the input's model is validated.
         *
         * @event xp-input-validation
         * @param {Element} firer
         * @param {string} name
         * @param {*} model
         * @bubbles
         */

        /**
         * Fired when the input's validity changes.
         *
         * @event xp-input-validity
         * @param {Element} firer
         * @param {string} name
         * @param {boolean} isValid
         * @bubbles
         */

        /*********************************************************************/

        /**
         * This method must be redefined to reflect the native input's `value` onto the element.
         *
         * @method _commitFrom
         * @abstract
         * @private
         */
        _commitFrom: XP.mock(),

        /**
         * This method must be redefined to reflect the element's `tabIndex` to the native input.
         *
         * @method _commitIndex
         * @param {number} index
         * @abstract
         * @private
         */
        _commitIndex: XP.mock(),

        /**
         * This method must be redefined to reflect the element's `value` onto the native input.
         *
         * @method _commitTo
         * @abstract
         * @private
         */
        _commitTo: XP.mock(),

        /**
         * This method must be redefined to inject the native input.
         *
         * @method _inject
         * @abstract
         * @private
         */
        _inject: XP.mock(),

        /**
         * This method must be redefined to sanitize the native input's `value`.
         *
         * @method _sanitize
         * @abstract
         * @private
         */
        _sanitize: XP.mock(),

        /**
         * This method must be redefined to update the native input's attributes.
         *
         * @method _update
         * @abstract
         * @private
         */
        _update: XP.mock(),

        /**
         * This method must be redefined to validate the native input's `value`.
         *
         * @method _validate
         * @param {boolean | string} [invalidMessage]
         * @abstract
         * @private
         */
        _validate: XP.mock(),

        /*********************************************************************/

        /**
         * Blurs the input.
         *
         * @method focus
         * @returns {Element}
         */
        blur: function () {

            // Vars
            var self = this;

            // Blurring
            if (self.input && self.input.blur) { self.input.blur(); }

            return self;
        },

        /**
         * Finds the input's label.
         *
         * @method findLabel
         * @returns {Element}
         */
        findLabel: function () {

            // Vars
            var self  = this,
                root  = self.id && Polymer.dom(self.domHost ? self.domHost.root : document),
                found = self.id && root.querySelector('label[for="' + self.id + '"]');

            // Finding
            return found || XP.findParentElement(self, 'label') || null;
        },

        /**
         * Focuses the input.
         *
         * @method focus
         * @returns {Element}
         */
        focus: function () {

            // Vars
            var self = this;

            // Focusing
            if (self.input && self.input.focus) { self.input.focus(); }

            return self;
        },

        /**
         * Selects the input.
         *
         * @method select
         * @param {boolean} [reset = false]
         * @returns {Element}
         */
        select: function (reset) {

            // Vars
            var self = this;

            // Resetting
            if (reset) { self.reset(); }

            // Focusing
            self.focus();

            // Selecting
            self._select();

            return self;
        },

        /**
         * Resets the input.
         *
         * @method reset
         * @returns {Element}
         */
        reset: function () {

            // Vars
            var self = this;

            // Resetting
            self.model = self.memento;

            // Setting
            self._setInvalid(false);
            self._setInvalidMessage(null);

            return self;
        },

        /**
         * Sanitizes the input's value.
         *
         * @method sanitize
         * @returns {number | string}
         */
        sanitize: function () {

            // Vars
            var self = this;

            // Sanitizing
            if (self.input) { self._sanitize(); }

            return self.value;
        },

        /**
         * Toggles the `checked` state.
         *
         * @method toggle
         * @returns {Element}
         */
        toggle: function () {

            // Vars
            var self = this;

            // Setting
            if (self.primitive === 'boolean' && !self.disabled) { self.checked = !self.checked; }

            return self;
        },

        /**
         * Updates the native input.
         *
         * @method update
         * @returns {Element}
         * @private
         */
        update: function () {

            // Vars
            var self = this;

            // Checking
            if (!self.input) { return self; }

            // Updating
            self._update();

            // Sanitizing
            self.sanitize();

            // Validating
            if (self.value || !self.required) { self.validate(); }

            // Firing
            self.fire('xp-input-update', {firer: self, name: self.name});

            return self;
        },

        /**
         * Validates the input's `value`.
         *
         * @method validate
         * @returns {Element}
         */
        validate: function () {

            // Vars
            var self = this;

            // Validating
            self._validate();

            // Firing
            self.fire('xp-input-validation', {firer: self, name: self.name, model: self.model});

            return self;
        },

        /*********************************************************************/

        /**
         * Selects the native input.
         *
         * @method _select
         * @returns {Element}
         * @private
         */
        _select: function () {

            // Vars
            var self = this;

            // Selecting
            if (self.input && self.input.select) { self.input.select(); }

            return self;
        },

        /**
         * Returns model representation of a native `value`.
         *
         * @method _toModel
         * @param {*} value
         * @returns {boolean | number | string}
         * @private
         */
        _toModel: function (value) {

            // Vars
            var self = this, from = XP.isPrimitive(value) ? value : null;

            // Casting
            if (self.primitive === 'boolean') { return XP.toBoolean(from); }
            if (self.primitive === 'number') { return XP.toNumber(from); }

            return XP.toString(from) || null;
        },

        /**
         * Returns native representation of a `model`.
         *
         * @method _toValue
         * @param {*} model
         * @returns {boolean | string}
         * @private
         */
        _toValue: function (model) {

            // Vars
            var self = this, from = XP.isPrimitive(model) ? model : null;

            // Casting
            if (self.primitive === 'boolean') { return XP.toBoolean(from, true); }

            return XP.toString(from, true);
        },

        /*********************************************************************/

        // LISTENERS
        listeners: {
            'click': '_clickHandler'
        },

        // OBSERVERS
        observers: [
            'update(disabled, form, input, name, type)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, the input will focus on attach.
             *
             * @attribute auto-focus
             * @type boolean
             * @default false
             */
            autoFocus: {
                type: Boolean,
                value: false
            },

            /**
             * The input's character count.
             *
             * @attribute chars
             * @type number
             * @default 0
             * @notifies
             * @readonly
             */
            chars: {
                notify: true,
                readOnly: true,
                type: Number,
                value: 0
            },

            /**
             * If set to true, the input is checked.
             *
             * @attribute checked
             * @type boolean
             * @notifies
             */
            checked: {
                notify: true,
                observer: '_checkedObserver',
                reflectToAttribute: true,
                type: Boolean
            },

            /**
             * If set to true, the input is disabled.
             *
             * @attribute disabled
             * @type boolean
             * @default false
             * @notifies
             */
            disabled: {
                notify: true,
                observer: '_disabledObserver',
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the input is empty.
             *
             * @attribute empty
             * @type boolean
             * @default true
             * @notifies
             * @readonly
             */
            empty: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: true
            },

            /**
             * A custom error message used instead of `invalidMessage`.
             *
             * @attribute error
             * @type string
             */
            error: {
                reflectToAttribute: true,
                type: String,
                value: null
            },

            /**
             * If set to true, the input is focused.
             *
             * @attribute focused
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            focused: {
                notify: true,
                observer: '_focusedObserver',
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The input's form.
             *
             * @attribute form
             * @type Element
             * @notifies
             * @readonly
             */
            form: {
                notify: true,
                observer: '_formObserver',
                readOnly: true,
                value: null
            },

            /**
             * If set to true, the input is hidden.
             *
             * @attribute hidden
             * @type boolean
             * @default false
             * @notifies
             */
            hidden: {
                notify: true,
                observer: '_hiddenObserver',
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The input's model's memento.
             *
             * @attribute memento
             * @type *
             * @notifies
             * @readonly
             */
            memento: {
                notify: true
            },

            /**
             * If set to true, the input is inline.
             *
             * @attribute inline
             * @type boolean
             * @default false
             */
            inline: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The native input.
             *
             * @attribute input
             * @type Element | Object
             * @notifies
             * @readonly
             */
            input: {
                notify: true,
                observer: '_inputObserver',
                readOnly: true
            },

            /**
             * If set to true, the input's value is not valid.
             *
             * @attribute invalid
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            invalid: {
                notify: true,
                observer: '_invalidObserver',
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The native input's error message.
             *
             * @attribute invalid-message
             * @type string
             * @notifies
             * @readonly
             */
            invalidMessage: {
                notify: true,
                readOnly: true,
                type: String,
                value: null
            },

            /**
             * The input's label.
             *
             * @attribute label
             * @type string
             */
            label: {
                reflectToAttribute: true,
                type: String,
                value: null
            },

            /**
             * The input's casted value, accordingly to its `type`.
             *
             * @attribute model
             * @type *
             * @notifies
             */
            model: {
                notify: true,
                observer: '_modelObserver'
            },

            /**
             * If set to true, the input's model is changed.
             *
             * @attribute modified
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            modified: {
                computed: '_computeModified(memento, model)',
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The input's name.
             *
             * @attribute name
             * @type string
             * @default ""
             */
            name: {
                reflectToAttribute: true,
                type: String,
                value: ''
            },

            /**
             * An additional input's model notification path.
             *
             * @attribute path
             * @type string
             */
            path: {
                type: String
            },

            /**
             * The input's primitive type.
             *
             * @attribute primitive
             * @type "boolean" | "number" | "string"
             * @default "string"
             * @notifies
             * @readonly
             */
            primitive: {
                computed: '_computePrimitive(type)',
                notify: true,
                observer: '_primitiveObserver',
                type: String,
                value: 'string'
            },

            /**
             * The input's type.
             *
             * @attribute type
             * @type string
             * @default "text"
             */
            type: {
                reflectToAttribute: true,
                type: String,
                value: 'text'
            },

            /**
             * The native input's value.
             *
             * @attribute value
             * @type string
             * @notifies
             */
            value: {
                notify: true,
                observer: '_valueObserver',
                type: String
            }
        },

        /**
         * The list of primitives.
         *
         * @property primitives
         * @type Array
         * @default ["boolean", "number", "string"]
         * @readonly
         */
        primitives: ['boolean', 'number', 'string'],

        /*********************************************************************/

        // COMPUTER
        _computeModified: function (memento, model) {
            return memento !== model;
        },

        // COMPUTER
        _computePrimitive: function (type) {
            if (type === 'checkbox' || type === 'radio') { return 'boolean'; }
            if (type === 'number' || type === 'range') { return 'number'; }
            return 'string';
        },

        /*********************************************************************/

        // OBSERVER
        _checkedObserver: function () {

            // Vars
            var self = this;

            // Checking
            if (self.primitive !== 'boolean') { return; }

            // Casting
            self.model = self._toModel(self.checked);

            // Committing
            if (self.input) { self._commitTo(); }

            // Validating
            if (self.input) { self.validate(); }

            // Firing
            self.fire('xp-input-change', {firer: self, name: self.name, model: self.model});
        },

        // OBSERVER
        _disabledObserver: function () {

            // Setting
            if (this.isAttached) { XP.setAttribute(this.findLabel(), 'disabled', this.disabled); }
        },

        // OBSERVER
        _focusedObserver: function () {

            // Setting
            if (this.isAttached) { XP.setAttribute(this.findLabel(), 'focused', this.focused); }
        },

        // OBSERVER
        _formObserver: function (post, pre) {

            // Listening
            if (pre) { this.unlisten(pre, 'reset', '_resetHandler'); }
            if (post) { this.listen(post, 'reset', '_resetHandler'); }
        },

        // OBSERVER
        _hiddenObserver: function () {

            // Vars
            var self = this;

            // Setting
            self.async(function () { self.model = self.hidden ? null : self.model; });

            // Setting
            if (self.isAttached) { XP.setAttribute(self.findLabel(), 'hidden', self.hidden); }
        },

        // OBSERVER
        _inputObserver: function () {

            // Vars
            var self = this;

            // Setting
            if (self.input) { self.input.adapter = self; } else { return; }

            // Listening
            if (XP.isElement(self.input)) {
                self.listen(self.input, 'blur', '_blurHandler');
                self.listen(self.input, 'change', '_changeHandler');
                self.listen(self.input, 'focus', '_focusHandler');
                self.listen(self.input, 'input', '_inputHandler');
            }

            // Mutating
            Polymer.XPInputBehaviorImp.mutated.apply(self, arguments);
        },

        // OBSERVER
        _invalidObserver: function () {

            // Firing
            this.fire('xp-input-validity', {firer: this, name: this.name, isValid: this.invalid});
        },

        // OBSERVER
        _modelObserver: function () {

            // Vars
            var self = this;

            // Memento
            if (!XP.isDefined(self.memento)) { self.memento = self.model; }

            // Firing
            self.async(function () { return self.path && self.domHost && self.domHost.set(self.path, self.model); });

            // Casting
            self[self.primitive === 'boolean' ? 'checked' : 'value'] = self._toValue(self.model);
        },

        // OBSERVER
        _primitiveObserver: function () {

            // Setting
            if (this.primitive === 'boolean') { this._setEmpty(false); }
        },

        // OBSERVER
        _valueObserver: function () {

            // Vars
            var self = this;

            // Checking
            if (self.primitive === 'boolean') { return; }

            // Sanitizing
            if (self.input && self.value !== self.sanitize()) { return; }

            // Casting
            self.model = self._toModel(self.value);

            // Setting
            self._setEmpty(!self.value);

            // Committing
            if (self.input) { self._commitTo(); }

            // Validating
            if (self.input) { self.validate(); }

            // Firing
            self.fire('xp-input-change', {firer: self, name: self.name, model: self.model});
        },

        /*********************************************************************/

        // LISTENER
        attached: function () {

            // Vars
            var self  = this,
                label = self.findLabel();

            // Setting
            self._setForm(XP.findParentElement(self, 'form') || null);
            self._setInvalid(false);

            // Overriding
            XP.setAttribute(label, 'disabled', self.disabled);
            XP.setAttribute(label, 'focused', self.focused);
            XP.setAttribute(label, 'hidden', self.hidden);

            // Listening
            if (self.scrollIntoViewIfNeeded) { self.listen(window, 'resize', '_resizeHandler'); }

            // Focusing
            if (self.autoFocus) { requestAnimationFrame(self.focus.bind(self)); }
        },

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('input');
        },

        // LISTENER
        detached: function () {

            // Vars
            var self = this;

            // Setting
            self._setForm(null);

            // Unlistening
            if (self.scrollIntoViewIfNeeded) { self.unlisten(window, 'resize', '_resizeHandler'); }
        },

        // LISTENER
        mutated: function () {

            // Vars
            var self = this;

            // Checking
            if (self._commitIndex === Polymer.XPInputBehaviorImp._commitIndex) { return; }

            // Disconnecting
            if (self.indexObserver) { self.indexObserver.disconnect(); }

            // Committing
            self.async(self._commitIndex.bind(self, Math.max(self.tabIndex, 0)));

            // Removing
            self.removeAttribute(self.input ? 'tabindex' : '');

            // Observing
            self.indexObserver = XP.onMutation(self, Polymer.XPInputBehaviorImp.mutated.bind(self), {attributes: true, attributeFilter: ['tabindex']});
        },

        // LISTENER
        ready: function () {

            // Vars
            var self = this;

            // Mapping
            self.mastersMap.form = 'form';

            // Setting
            self.async(function () { self.model = XP.isDefined(self.model) ? self.model : null; });

            // Injecting
            self.async(self._inject.bind(self));

            // Committing
            self.async(self._commitTo.bind(self));
        },

        /*********************************************************************/

        // HANDLER
        _blurHandler: function () {

            // Setting
            this._setFocused(false);
        },

        // HANDLER
        _changeHandler: function () {

            // Committing
            this._commitFrom();
        },

        // HANDLER
        _clickHandler: function () {

            // Focusing
            if (!this.disabled) { this.focus(); }
        },

        // HANDLER
        _focusHandler: function () {

            // Setting
            this._setFocused(!this.disabled);
        },

        // HANDLER
        _inputHandler: function () {

            // Sanitizing
            if (this.primitive === 'string') { this.sanitize(); }
        },

        // HANDLER
        _resetHandler: function () {

            // Resetting
            this.async(this.reset.bind(this));
        },

        // HANDLER
        _resizeHandler: function () {

            // Vars
            var self = this;

            // Checking
            if (!self.focused) { return; }

            // Scrolling
            self.debounce('scroll', function () { requestAnimationFrame(function () { self.scrollIntoViewIfNeeded(); }); });
        }
    };

    Polymer.XPInputBehavior = [
        Polymer.XPSlaveBehavior,
        Polymer.XPInputBehaviorImp
    ];
Polymer.MatInputBehaviorImp = {

        /**
         * Used internally with auto growing inputs to keep the mirror updated.
         *
         * @method _mirror
         * @param {string} value
         * @returns {Element}
         * @private
         */
        _mirror: function (value) {
            var self = this;
            if (self.mirror) { self.mirror.innerHTML = XP.escape(value).replace(/\n/g, '<br/>') + '&nbsp;'; }
            return self;
        },

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_maxRowsObserver(maxRows, mirror)',
            '_minRowsObserver(minRows, mirror)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The input's holder.
             *
             * @attribute holder
             * @type Element
             * @notifies
             * @readonly
             */
            holder: {
                notify: true,
                readOnly: true
            },

            /**
             * The input's mirror.
             *
             * @attribute mirror
             * @type Element
             * @notifies
             * @readonly
             */
            mirror: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the input is mirrored.
             *
             * @attribute mirrored
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            mirrored: {
                computed: '_computeMirrored(mirror)',
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeCounter: function (chars, maxLength) {
            return (maxLength && (chars + ' / ' + maxLength)) || '';
        },

        // COMPUTER
        _computeDescription: function (description, error, invalid, invalidMessage) {
            return (invalid && (error || invalidMessage)) || description || '';
        },

        // COMPUTER
        _computeFloated: function (empty, floatingLabel, focused, fullWidth, label) {
            return !!label && !!floatingLabel && !fullWidth && (!!focused || !empty);
        },

        // COMPUTER
        _computeLabel: function (floated, inputPrefix, label) {
            return ((!floated && inputPrefix) || '') + (label || '');
        },

        // COMPUTER
        _computeLabelOpacity: function (floated) {
            return floated ? 'secondary' : 'hint';
        },

        // COMPUTER
        _computeMirrored: function (mirror) {
            return !!mirror;
        },

        /*********************************************************************/

        // OBSERVER
        _inputObserver: function (post) {

            // Vars
            var self = this;

            // Super
            Polymer.XPInputBehaviorImp._inputObserver.apply(self, arguments);

            // Listening
            if (self.mirror) { self.listen(post, 'input', '_mirrorHandler'); }
        },

        // OBSERVER
        _maxRowsObserver: function () {

            // Vars
            var self = this,
                rows = XP.toInt(self.maxRows, true);

            // Styling
            self.mirror.style.maxHeight = rows ? (rows * 24) + 'px' : '';
        },

        // OBSERVER
        _minRowsObserver: function () {

            // Vars
            var self = this,
                rows = XP.toInt(self.minRows, true) || 1;

            // Styling
            self.mirror.style.minHeight = rows ? (rows * 24) + 'px' : '';
        },

        // OBSERVER
        _valueObserver: function (post) {

            // Vars
            var self = this;

            // Super
            Polymer.XPInputBehaviorImp._valueObserver.apply(self, arguments);

            // Mirroring
            self._mirror(post);
        },

        /*********************************************************************/

        // LISTENER
        ready: function () {

            // Vars
            var self   = this,
                root   = Polymer.dom(self.root),
                holder = root.querySelector('.holder'),
                mirror = root.querySelector('.mirror');

            // Setting
            if (holder) { self._setHolder(holder); }
            if (mirror) { self._setMirror(mirror); }
        },

        /*********************************************************************/

        // HANDLER
        _mirrorHandler: function () {

            // Mirroring
            this._mirror(this.input.value);
        }
    };

    Polymer.MatInputBehavior = [
        Polymer.XPInputBehavior,
        Polymer.MatInputBehaviorImp
    ];
Polymer.XPFinderBehaviorImp = {

        /**
         * Finds an item's index.
         *
         * @method findIndex
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {number | string}
         */
        findIndex: function (identity, safe) {
            var self = this, item = self.findItem(identity, safe);
            if (item && self.indexAttribute) { return XP.getAttribute(item, self.indexAttribute) || null; }
            if (item) { return XP.indexOf(self.items || [], item); }
            return null;
        },

        /**
         * Finds an item.
         *
         * @method findItem
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {Element}
         */
        findItem: function (identity, safe) {
            return safe ? identity : XP.find(this.items || [], this._toDOMIdentity(identity)) || null;
        },

        /**
         * Finds items filtered by predicate.
         *
         * @method findItems
         * @param {Function} [predicate]
         * @returns {Array}
         */
        findItems: function (predicate) {
            return XP.filter(this.items || [], this._toDOMPredicate(predicate));
        },

        /**
         * Finds an item's index, iterating from right to left.
         *
         * @method findLastIndex
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {number | string}
         */
        findLastIndex: function (identity, safe) {
            var self = this, item = self.findLastItem(identity, safe);
            if (item && self.indexAttribute) { return XP.getAttribute(item, self.indexAttribute) || null; }
            if (item) { return XP.indexOf(self.items || [], item) || null; }
            return null;
        },

        /**
         * Finds an item, iterating from right to left.
         *
         * @method findLastItem
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {Element}
         */
        findLastItem: function (identity, safe) {
            return safe ? identity : XP.findLast(this.items || [], this._toDOMIdentity(identity)) || null;
        },

        /*********************************************************************/

        /**
         * Returns a DOM identity representation of `target`.
         *
         * @method _toDOMIdentity
         * @param {Element | Function | number | string} target
         * @returns {Function | number}
         * @private
         */
        _toDOMIdentity: function (target) {

            // Vars
            var self      = this,
                attribute = self.indexAttribute,
                index     = attribute ? target : XP.toNumber(target);

            // Casting
            if (XP.isIndex(index)) { return index; }
            if (XP.isString(target, true) && XP.isString(attribute, true)) { return function (element) { return XP.isElement(element) && target === element.getAttribute(attribute); }; }
            if (XP.isElement(target) || XP.isFunction(target) || XP.isString(target, false) || XP.isVoid(target)) { return XP.toDOMIdentity(target); }

            // Asserting
            throw new XP.ArgumentError(1, 'Element, Function, number or string');
        },

        /**
         * Returns a DOM predicate representation of `target`.
         *
         * @method _toDOMPredicate
         * @param {Function} [target]
         * @returns {Function}
         * @private
         */
        _toDOMPredicate: function (target) {

            // Casting
            if (XP.isVoid(target) || XP.isFunction(target)) { return XP.toDOMPredicate(target); }

            // Asserting
            throw new XP.ArgumentError(1, 'Function');
        },

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_itemsObserver(items.*)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, there are no items.
             *
             * @attribute empty-items
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            emptyItems: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the items will be searched deep.
             *
             * @attribute find-deep
             * @type boolean
             * @default false
             * @readonly
             */
            findDeep: {
                readOnly: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the items will be searched into the ShadowDOM.
             *
             * @attribute find-shadow
             * @type boolean
             * @default false
             * @readonly
             */
            findShadow: {
                readOnly: true,
                type: Boolean,
                value: false
            },

            /**
             * The attribute used as index.
             *
             * @attribute index-attribute
             * @type string
             */
            indexAttribute: {
                type: String
            },

            /**
             * If set to true, the items are initialized.
             *
             * @attribute initialized
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            initialized: {
                notify: true,
                readOnly: true,
                type: Boolean,
                value: false
            },

            /**
             * The selector used to recognize items.
             *
             * @attribute item-selector
             * @type string
             * @default ".item"
             */
            itemSelector: {
                type: String,
                value: '.item'
            },

            /**
             * The found items.
             *
             * @attribute items
             * @type Array
             * @notifies
             */
            items: {
                notify: true
            },

            /**
             * If set to true, there's only one item.
             *
             * @attribute single-item
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            singleItem: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /*********************************************************************/

        // OBSERVER
        _itemsObserver: function () {

            // Vars
            var self = this;

            // Setting
            self._setEmptyItems(!self.items || !self.items.length);
            self._setInitialized(self.initialized || !self.emptyItems);
            self._setSingleItem(!!self.items && self.items.length === 1);
        },

        /*********************************************************************/

        // LISTENER
        attached: function () {

            // Vars
            var self = this;

            // Setting
            if (!self.items) { self.items = []; } else { return; }

            // Observing
            Polymer.XPFinderBehaviorImp.mutated.apply(self, arguments);
        },

        // LISTENER
        mutated: function () {

            // Vars
            var self = this;

            // Setting
            self.overwrite('items', XP[self.findDeep ? 'getElements' : 'findElements'](Polymer.dom(self.findShadow ? self.root : self), self.itemSelector));

            // Observing
            XP.onMutation((self.findShadow && self.shadowRoot) || self, Polymer.XPFinderBehaviorImp.mutated.bind(self));
        }
    };

    Polymer.XPFinderBehavior = [
        Polymer.XPArrayBehavior,
        Polymer.XPFinderBehaviorImp
    ];
Polymer.XPMenuBehaviorImp = {

        // LISTENERS
        listeners: {
            'xp-activate': '_optionHandler'
        },

        // OBSERVERS
        observers: [
            '_submenusObserver(submenus.*)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, the menu is a cascade one.
             *
             * @attribute cascade
             * @type boolean
             * @default false
             * @notifies
             */
            cascade: {
                notify: true,
                observer: '_cascadeObserver',
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the items will be deep searched.
             *
             * @attribute find-deep
             * @type boolean
             * @default true
             * @readonly
             */
            findDeep: {
                readOnly: true,
                type: Boolean,
                value: true
            },

            /**
             * The selector used to recognize items.
             *
             * @attribute item-selector
             * @type string
             * @default ".option"
             */
            itemSelector: {
                type: String,
                value: '.option'
            },

            /**
             * The slave submenus.
             *
             * @attribute submenus
             * @type Array
             * @notifies
             * @readonly
             */
            submenus: {
                notify: true,
                readOnly: true,
                value: function () { return []; }
            }
        },

        /*********************************************************************/

        // OBSERVER
        _cascadeObserver: function () {

            // Setting
            if (this.cascade && (this.position === 'over' || !this.position)) { this.position = 'baseline'; }
        },

        // OBSERVER
        _showedObserver: function () {

            // Vars
            var self = this;

            // Super
            Polymer.XPOverlayBehaviorImp._showedObserver.apply(self, arguments);

            // Hiding
            if (!self.showed) { XP.invoke(self.submenus || [], 'hide'); }
        },

        // OBSERVER
        _submenusObserver: function () {

            // Setting
            if (this.submenus.length) { this.cascade = true; }
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('menu');
        },

        // LISTENER
        ready: function () {

            // Mapping
            this.slavesMap.submenus = '.submenu';
        },

        /*********************************************************************/

        // HANDLER
        _optionHandler: function (event) {

            // Vars
            var self  = this;

            // Checking
            if (event.detail.firer.toggleable || !event.detail.firer.classList.contains('option')) { return; }

            // Frame 1
            requestAnimationFrame(function () { return event.defaultPrevented || self.hide(); });
        }
    };

    Polymer.XPMenuBehavior = [
        Polymer.XPFinderBehavior,
        Polymer.XPMasterBehavior,
        Polymer.XPOverlayBehavior,
        Polymer.XPMenuBehaviorImp
    ];
Polymer.XPSelectorBehaviorImp = {

        /**
         * Fired on item selection.
         *
         * @event xp-select
         * @param {Element} firer
         * @param {Element} item
         * @param {number | string} index
         * @param {boolean} isMulti
         * @param {boolean} isSelected
         * @param {boolean} isSwitchable
         * @param {*} data
         * @bubbles
         * @cancelable
         */

        /**
         * Fired when the selection changes.
         *
         * @event xp-selection
         * @param {Element} firer
         * @param {Array | Element} selection
         * @param {Array | number | string} selected
         * @param {boolean} isMulti
         * @param {boolean} isSwitchable
         * @bubbles
         */

        /*********************************************************************/

        /**
         * Checks if an item is selectable.
         *
         * @method isSelectable
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {boolean}
         */
        isSelectable: function (identity, safe) {

            // Vars
            var self = this,
                item = self.findItem(identity, safe);

            // Checking
            return !!self.items && self.items.indexOf(item) >= 0 && !self.isSelected(item);
        },

        /**
         * Checks if an item is selected.
         *
         * @method isSelected
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {boolean}
         */
        isSelected: function (identity, safe) {

            // Vars
            var self = this,
                item = self.findItem(identity, safe);

            // Checking
            return self.multi ? self.selection.indexOf(item) >= 0 : self.selection === item;
        },

        /**
         * Checks if an item is unselectable.
         *
         * @method isUnselectable
         * @param {Element | Function | number | string} identity
         * @param {boolean} [force = false]
         * @param {boolean} [safe = false]
         * @returns {boolean}
         */
        isUnselectable: function (identity, force, safe) {

            // Vars
            var self = this,
                item = self.findItem(identity, safe);

            // Checking
            return !!self.items && self.items.indexOf(item) >= 0 && self.isSelected(item) && (!!force || self.multi || self.switchable);
        },

        /**
         * Selects an item.
         *
         * @method select
         * @param {Element | Function | number | string} identity
         * @param {boolean} [safe = false]
         * @returns {Element}
         */
        select: function (identity, safe) {

            // Vars
            var self  = this,
                item  = self.findItem(identity, safe),
                index = self.findIndex(item, true);

            // Checking
            if (!item || !self.isSelectable(item)) { return null; }

            // Firing
            if (self.fire('xp-select', {firer: self, item: item, index: index, isMulti: self.multi, isSelected: true, isSwitchable: self.multi || self.switchable, data: item.data}, {cancelable: true}).defaultPrevented) { return null; }

            // Setting
            self._setSelecting(true);

            // Selecting
            if (self.multi) { self.append('selection', item); } else { self._setSelection(item); }
            if (self.multi) { self.append('selected', index); } else { self.selected = index; }

            // Setting
            self._setSelecting(false);

            return item;
        },

        /**
         * Selects all items.
         *
         * @method selectAll
         * @param {Function} [predicate]
         * @returns {Array}
         */
        selectAll: function (predicate) {

            // Vars
            var self = this;

            // Checking
            if (!self.multi) { return []; }

            // Selecting
            return XP.map(self.findItems(predicate), function (item) { return self.select(item, true); });
        },

        /**
         * Selects the next item.
         *
         * @method selectNext
         * @returns {Element}
         */
        selectNext: function () {

            // Vars
            var self = this;

            // Checking
            if (self.multi) { return null; }

            // Selecting
            return self.select(XP.getNext(self.items || [], self.selection), true);
        },

        /**
         * Selects the previous item.
         *
         * @method selectPrevious
         * @returns {Element}
         */
        selectPrevious: function () {

            // Vars
            var self = this;

            // Checking
            if (self.multi) { return null; }

            // Selecting
            return self.select(XP.getPrevious(self.items || [], self.selection), true);
        },

        /**
         * Switches an item's active state.
         *
         * @method switch
         * @param {Element | Function | number | string} identity
         * @param {boolean} [force = false]
         * @param {boolean} [safe = false]
         * @returns {Element}
         */
        switch: function (identity, force, safe) {

            // Vars
            var self = this,
                item = self.findItem(identity, safe);

            // Checking
            if (!item) { return null; }

            // Switching
            return self.isSelected(item) ? self.unselect(item, force, true) : self.select(item, true);
        },

        /**
         * Unselects an item.
         *
         * @method unselect
         * @param {Element | Function | number | string} identity
         * @param {boolean} [force = false]
         * @param {boolean} [safe = false]
         * @returns {Element}
         */
        unselect: function (identity, force, safe) {

            // Vars
            var self  = this,
                item  = self.findItem(identity, safe),
                index = self.findIndex(item, true);

            // Checking
            if (!item || !self.isUnselectable(item, force)) { return null; }

            // Firing
            if (self.fire('xp-select', {firer: self, item: item, index: index, isMulti: self.multi, isSelected: false, isSwitchable: self.multi || self.switchable, data: item.data}, {cancelable: !force}).defaultPrevented) { return null; }

            // Setting
            self._setSelecting(true);

            // Unselecting
            if (self.multi) { self.pull('selection', item); } else { self._setSelection(null); }
            if (self.multi) { self.pull('selected', index); } else { self.selected = null; }

            // Setting
            self._setSelecting(false);

            return item;
        },

        /**
         * Unselects all items.
         *
         * @method unselectAll
         * @param {Function} [predicate]
         * @param {boolean} [force = false]
         * @returns {Array}
         */
        unselectAll: function (predicate, force) {

            // Vars
            var self = this;

            // Checking
            if (!self.multi && !self.switchable && !force) { return []; }

            // Unselecting
            return XP.map(self.findItems(predicate), function (item) { return self.unselect(item, force, true); });
        },

        /**
         * Resets the selection.
         *
         * @method resetSelection
         * @returns {Element}
         */
        resetSelection: function () {

            // Vars
            var self = this;

            // Unselecting
            self.unselectAll(null, true);

            return self;
        },

        /*********************************************************************/

        // LISTENERS
        listeners: {
            'click': '_switchHandler'
        },

        // OBSERVERS
        observers: [
            '_initializedObserver(initialized)',
            '_selectedObserver(selected.*)',
            '_selectionObserver(selection.*)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The index of the item to select by default.
             *
             * @attribute default-selected
             * @type number | string
             */
            defaultSelected: {},

            /**
             * If set to true, there are no selected items.
             *
             * @attribute empty-selection
             * @type boolean
             * @default true
             * @notifies
             * @readonly
             */
            emptySelection: {
                computed: '_computeEmptySelection(selection.*)',
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: true
            },

            /**
             * The selector used to recognize items.
             *
             * @attribute item-selector
             * @type string
             * @default ".selectable"
             */
            itemSelector: {
                type: String,
                value: '.selectable'
            },

            /**
             * If set to true, the items will be selected on tap.
             *
             * @attribute selectable
             * @type boolean
             * @default false
             */
            selectable: {
                observer: '_selectableObserver',
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The selected item's index.
             *
             * @attribute selected
             * @type Array | number | string
             * @notifies
             */
            selected: {
                notify: true
            },

            /**
             * The attribute set on selection.
             *
             * @attribute selected-attribute
             * @type string
             * @default "active"
             */
            selectedAttribute: {
                type: String,
                value: 'active'
            },

            /**
             * The selected item's data.
             *
             * @attribute selected-data
             * @type *
             * @notifies
             * @readonly
             */
            selectedData: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the selection is changing.
             *
             * @attribute selecting
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            selecting: {
                notify: true,
                readOnly: true,
                type: Boolean,
                value: false
            },

            /**
             * The selected item.
             *
             * @attribute selection
             * @type Array | Element
             * @notifies
             * @readonly
             */
            selection: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the items can be unselected.
             *
             * @attribute switchable
             * @type boolean
             * @default false
             * @notifies
             */
            switchable: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeEmptySelection: function () {
            return !this.selection || XP.isArray(this.selection, false);
        },

        /*********************************************************************/

        // OBSERVER
        _initializedObserver: function () {

            // Vars
            var self = this;

            // Checking
            if (!self.initialized) { return; }

            // Selecting
            if (XP.isInput(self.defaultSelected)) { self.select(self.indexAttribute ? self.defaultSelected : XP.toIndex(self.defaultSelected, true)); return; }
            if (XP.isInput(self.selected)) { self.select(self.selected); }
        },

        // OBSERVER
        _itemsObserver: function () {

            // Vars
            var self = this;

            // Super
            Polymer.XPFinderBehaviorImp._itemsObserver.apply(self, arguments);

            // Checking
            if (!self.initialized) { return; }

            // Setting
            self._setSelecting(true);

            // Selecting
            if (self.multi) { self.overwrite('selection', XP.intersection(self.items || [], self.selection)); } else { self._setSelection(self.findItem(self.selection)); }
            if (self.multi) { self.overwrite('selected', XP.map(self.selection, function (item) { return self.findIndex(item, true); })); } else { self.selected = self.findIndex(self.selection, true); }

            // Setting
            self._setSelecting(false);
        },

        // OBSERVER
        _selectableObserver: function () {

            // Selecting
            if (!this.selectable) { this.unselectAll(null, true); }
        },

        // OBSERVER
        _selectedObserver: function () {

            // Vars
            var self   = this,
                target = self.findTarget();

            // Selecting
            if (!self.selecting && self.multi) { self.overwrite('selection', XP.map(self.selected, function (identity) { return self.findItem(identity); })); }
            if (!self.selecting && !self.multi) { self._setSelection((XP.isInput(self.selected) && self.findItem(self.selected)) || null); }

            // Propagating
            if (target) { target.selected = self.selected; }
        },

        // OBSERVER
        _selectionObserver: function () {

            // Vars
            var self = this;

            // Setting
            self._setSelectedData(self.selection && !self.multi ? XP.toDefined(self.selection.data) : null);

            // Mutating
            if (self.items) { self.items.forEach(function (item) { XP.setAttribute(item, self.selectedAttribute, self.isSelected(item, true)); }); }

            // Firing
            self.fire('xp-selection', {firer: self, selection: self.selection, selected: self.selected, isMulti: self.multi, isSwitchable: self.multi || self.switchable});
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('selector');
        },

        /*********************************************************************/

        // HANDLER
        _switchHandler: function (event) {

            // Checking
            if (event.button || event.selectPrevented || !this.selectable) { return; }

            // Vars
            var self   = this,
                target = Polymer.dom(event).rootTarget,
                item   = self.findItem(target) || self.findItem(XP.findParentElement(target, self.itemSelector, self));

            // Switching
            if (item) { self.switch(item, false, true); }

            // Checking
            if (!item || !item.href || item.tagName !== 'A') { return; }

            // Firing
            if (self.fire('xp-redirect', {firer: self, anchor: item, href: item.href}, {cancelable: true}).defaultPrevented) { event.preventDefault(); }
        }
    };

    Polymer.XPSelectorBehavior = [
        Polymer.XPArrayBehavior,
        Polymer.XPFinderBehavior,
        Polymer.XPTargeterBehavior,
        Polymer.XPSelectorBehaviorImp
    ];
Polymer.MatPressedPaperBehaviorImp = {

        /**
         * Makes the paper fall.
         *
         * @method _fall
         * @returns {Element}
         * @private
         */
        _fall: function () {

            // Vars
            var self = this;

            // Checking
            if (self.zRaising || !self.z) { return self; }

            // Setting
            self.z         = self.pressed ? self.z : self.zPrevious;
            self.zPrevious = self.pressed ? self.zPrevious : 0;
            self.zRaising  = false;

            return self;
        },

        /**
         * Makes the paper raise.
         *
         * @method _raise
         * @returns {Element}
         * @private
         */
        _raise: function () {

            // Vars
            var self = this;

            // Checking
            if (self.zRaising || !self.z) { return self; }

            // Setting
            self.zRaising  = true;
            self.zPrevious = self.z;
            self.z         = Math.min(self.z + self.zElevation, self.zMax);

            // Delaying
            self.async(function () { self.zRaising = false; self._fall(); }, 400);

            return self;
        },

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_backgroundObserver(active, activeBackground)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The paper's active background.
             *
             * @attribute active-background
             * @type string
             */
            activeBackground: {
                type: String
            }
        },

        /**
         * The elevation value of z.
         *
         * @property zElevation
         * @type number
         * @default 6
         * @readonly
         */
        zElevation: 6,

        /**
         * The maximum value of z.
         *
         * @property zMax
         * @type number
         * @default 24
         * @readonly
         */
        zMax: 24,

        /**
         * The previous value of z.
         *
         * @property zPrevious
         * @type number
         * @default 0
         * @readonly
         */
        zPrevious: 0,

        /**
         * If set to true, the paper is raising from the rest position.
         *
         * @property zRaising
         * @type boolean
         * @default false
         * @readonly
         */
        zRaising: false,

        /*********************************************************************/

        // OBSERVER
        _backgroundObserver: function () {

            // Setting
            this._setCurrentBackground((this.active && this.activeBackground) || this.background || null);
        },

        /*********************************************************************/

        // HANDLER
        _touchHandler: function (event) {

            // Vars
            var self = this;

            // Super
            Polymer.MatPressedBehaviorImp._touchHandler.apply(self, arguments);

            // Checking
            if (event.pressed !== self) { return; }

            // Raising
            if (self.pressed) { self._raise(); } else { self._fall(); }
        }
    };

    Polymer.MatPressedPaperBehavior = [
        Polymer.MatPaperBehavior,
        Polymer.MatPressedBehavior,
        Polymer.MatPressedPaperBehaviorImp
    ];
Polymer.XPLabelBehavior = {

        /**
         * Finds the labeled input.
         *
         * @method findInput
         * @returns {Element}
         */
        findInput: function () {

            // Vars
            var self      = this,
                root      = self.domHost && Polymer.dom(self.domHost.root),
                input     = self.htmlFor && (root ? root.querySelector('#' + self.htmlFor) : document.getElementById(self.htmlFor)),
                selectors = self.htmlFor ? [] : self.selectors,
                wrapped   = !input && Polymer.dom(self);

            // Finding
            return input || XP.reduce(selectors, function (input, selector) { return input || wrapped.querySelector(selector); }) || null;
        },

        /*********************************************************************/

        // LISTENERS
        listeners: {
            'click': '_focusHandler'
        },

        // PROPERTIES
        properties: {

            /**
             * If set to true, the element is disabled.
             *
             * @attribute disabled
             * @type boolean
             * @default false
             * @notifies
             */
            disabled: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the element is focused.
             *
             * @attribute focused
             * @type boolean
             * @default false
             * @notifies
             */
            focused: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the element is hidden.
             *
             * @attribute hidden
             * @type boolean
             * @default false
             * @notifies
             */
            hidden: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /**
         * The list of available inputs the label can work with
         *
         * @property selectors
         * @type Array
         * @default ["textarea", "select", "input"]
         * @readonly
         */
        selectors: ['textarea', 'select', 'input'],

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('label');
        },

        /*********************************************************************/

        // HANDLER
        _focusHandler: function (event) {

            // Vars
            var self  = this,
                input = !event.button && self.findInput();

            // Focusing
            if (input) { input.focus(); input.click(); }
        }
    };
Polymer.XPSelectorMultiBehaviorImp = {

        // PROPERTIES
        properties: {

            /**
             * If set to true, multi selection is allowed.
             *
             * @attribute multi
             * @type boolean
             * @default false
             * @notifies
             */
            multi: {
                observer: '_multiObserver',
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            }
        },

        /*********************************************************************/

        // OBSERVER
        _multiObserver: function () {

            // Vars
            var self = this;

            // Setting
            self._setSelection(self.multi ? XP.toArray(self.selection, true) : (!XP.isArray(self.selection) ? self.selection : null));
            self.selected = self.multi ? XP.toArray(self.selected, true) : (!XP.isArray(self.selected) ? self.selected : null);
        }
    };

    Polymer.XPSelectorMultiBehavior = [
        Polymer.XPSelectorBehavior,
        Polymer.XPSelectorMultiBehaviorImp
    ];
Polymer.XPListBehaviorImp = {

        /**
         * Fired when the anchor is clicked.
         *
         * @event xp-redirect
         * @param {Element} firer
         * @param {Element} anchor
         * @param {string} href
         * @bubbles
         * @cancelable
         */

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * If set to true, when a sublist expands the siblings wont collapse.
             *
             * @attribute auto-collapse-disabled
             * @type boolean
             * @default false
             */
            autoCollapseDisabled: {
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the items will be deep searched.
             *
             * @attribute find-deep
             * @type boolean
             * @default true
             * @readonly
             */
            findDeep: {
                readOnly: true,
                type: Boolean,
                value: true
            },

            /**
             * The selector used to recognize items.
             *
             * @attribute item-selector
             * @type string
             * @default ".item"
             */
            itemSelector: {
                type: String,
                value: '.item'
            },

            /**
             * The slave sublists.
             *
             * @attribute sublists
             * @type Array
             * @notifies
             * @readonly
             */
            sublists: {
                notify: true,
                readOnly: true,
                value: function () { return []; }
            }
        },

        /*********************************************************************/

        // OBSERVER
        _selectionObserver: function () {

            // Vars
            var self      = this,
                superlist = self.selection && !self.multi && XP.findParentElement(self.selection, '.sublist[collapsible]', self);

            // Super
            Polymer.XPSelectorBehaviorImp._selectionObserver.apply(self, arguments);

            // Expanding
            if (superlist) { superlist.expand(); }
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('list');
        },

        // LISTENER
        ready: function () {

            // Mapping
            this.slavesMap.sublists = '.sublist';
        }
    };

    Polymer.XPListBehavior = [
        Polymer.XPMasterBehavior,
        Polymer.XPSelectorMultiBehavior,
        Polymer.XPListBehaviorImp
    ];
Polymer.XPPagesBehaviorImp = {

        /**
         * Fired when a page is closing.
         *
         * @event xp-page-close
         * @param {Element} firer
         * @param {number | string} index
         * @param {boolean} isActive
         * @bubbles
         * @cancelable
         */

        /*********************************************************************/

        /**
         * Closes a page.
         *
         * @method close
         * @param {Element | Function | number | string} identity
         * @returns {Element}
         */
        close: function (identity) {

            // Vars
            var self  = this,
                item  = self.findItem(identity),
                index = self.findIndex(item, true);

            // Checking
            if (!item || !item.closable) { return null; }

            // Firing
            if (item.fire('xp-page-close', {firer: item, index: index, isActive: !!item.active}, {cancelable: true}).defaultPrevented) { return null; }

            // Removing
            return Polymer.dom(Polymer.dom(item).parentNode).removeChild(item);
        },

        /**
         * Opens a page.
         *
         * @method open
         * @param {Object} [properties]
         * @param {boolean} [autoSelect = false]
         * @returns {Element}
         */
        open: function (properties, autoSelect) {

            // Vars
            var self = this;

            // Frame 1
            requestAnimationFrame(function () {

                // Vars
                var item = self.itemTag && document.createElement(self.itemTag),
                    page = item && XP.assign(item, properties, {closable: true});

                // Appending
                if (page) { self.append('items', Polymer.dom(self).appendChild(page)); } else { return null; }

                // Selecting
                if (autoSelect) { requestAnimationFrame(self.select.bind(self, page, true)); }
            });

            return self;
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * The selector used to recognize items.
             *
             * @attribute item-selector
             * @type string
             * @default ".page"
             */
            itemSelector: {
                type: String,
                value: '.page'
            },

            /**
             * The tag used to append new items.
             *
             * @attribute item-tag
             * @type string
             * @readonly
             */
            itemTag: {
                readOnly: true,
                type: String
            },

            /**
             * The found items.
             *
             * @attribute items
             * @type Array
             * @notifies
             */
            items: {
                value: function () { return []; }
            }
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('pages');
        },

        // LISTENER
        ready: function () {

            // Mapping
            this.slavesMap.items = '.page';
        }
    };

    Polymer.XPPagesBehavior = [
        Polymer.XPMasterBehavior,
        Polymer.XPSelectorBehavior,
        Polymer.XPPagesBehaviorImp
    ];
Polymer.XPPageBehaviorImp = {

        /**
         * Fired when the something has been injected.
         *
         * @event xp-inject
         * @param {Element} firer
         * @param {Element} injected
         * @bubbles
         */

        /*********************************************************************/

        // LISTENERS
        listeners: {
            'xp-slave': '_slaveHandler'
        },

        // OBSERVERS
        observers: [
            '_contentObserver(active, content, lazy)',
            '_dataObserver(data, injected)',
            '_injectedObserver(active, injected)'
        ],

        // PROPERTIES
        properties: {

            /**
             * If set to true, the page is active.
             *
             * @attribute active
             * @type boolean
             * @default false
             * @notifies
             */
            active: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the page can be closed.
             *
             * @attribute closable
             * @type boolean
             * @default false
             * @notifies
             */
            closable: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The `tagName` of the element to inject into the page.
             *
             * @attribute content
             * @type string
             * @notifies
             */
            content: {
                notify: true,
                reflectToAttribute: true,
                type: String
            },

            /**
             * The page's data.
             *
             * @attribute data
             * @type *
             */
            data: {},

            /**
             * If set to true, there's nothing injected.
             *
             * @attribute empty
             * @type boolean
             * @notifies
             * @readonly
             */
            empty: {
                computed: '_computeEmpty(injected)',
                notify: true,
                type: Boolean,
                value: true
            },

            /**
             * The injected element.
             *
             * @attribute injected
             * @type Element
             * @notifies
             * @readonly
             */
            injected: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the content will be injected on active.
             *
             * @attribute lazy
             * @type boolean
             * @default false
             */
            lazy: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the page is not scrollable.
             *
             * @attribute scroll-disabled
             * @type boolean
             * @default false
             */
            scrollDisabled: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The master selector.
             *
             * @attribute selector
             * @type Element
             * @notifies
             */
            selector: {
                notify: true,
                readOnly: true
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeEmpty: function (injected) {
            return !injected;
        },

        /*********************************************************************/

        // OBSERVER
        _contentObserver: function () {

            // Vars
            var self = this;

            // Frame 1
            requestAnimationFrame(function () {

                // Vars
                var wrapped   = Polymer.dom(self),
                    removable = self.injected && (!self.content || self.content.toUpperCase() !== self.injected.tagName || (self.lazy && !self.active)),
                    injected  = self.content && (removable || !self.injected) && (self.active || !self.lazy) && document.createElement(self.content);

                // Preparing
                if (injected && XP.isDefined(self.data)) { injected.data = self.data; }

                // Removing
                if (removable) { wrapped.removeChild(self.injected); }

                // Appending
                if (injected) { wrapped.appendChild(injected); }

                // Setting
                if (injected || removable) { self._setInjected(injected || null); }

                // Firing
                if (injected) { self.fire('xp-inject', {firer: self, injected: injected}); }
            });
        },

        // OBSERVER
        _dataObserver: function () {

            // Setting
            if (this.injected) { this.injected.data = this.data; }
        },

        // OBSERVER
        _injectedObserver: function () {

            // Setting
            XP.setAttribute(this.injected, 'active', this.active);
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('page');
        },

        // LISTENER
        ready: function () {

            // Mapping
            this.mastersMap.selector = '.pages';
        },

        /*********************************************************************/

        // HANDLER
        _slaveHandler: function (event) {

            // Vars
            var self     = this,
                firer    = event.detail.firer,
                selector = event.detail.selector;

            // Stopping
            if (firer !== self && selector === '.pages' && firer.classList.contains('page')) { event.stopPropagation(); }
        }
    };

    Polymer.XPPageBehavior = [
        Polymer.XPSlaveBehavior,
        Polymer.XPPageBehaviorImp
    ];
Polymer.XPObjectBehavior = {

        /**
         * Set `value` at the specified `path`, creating it if not exists.
         *
         * @method enforce
         * @param {string} path
         * @param {*} value
         * @returns {*}
         */
        enforce: function (path, value) {

            // Asserting
            XP.assertArgument(XP.isString(path, true), 1, 'string');

            // Vars
            var self    = this,
                current = self,
                force   = false,
                parts   = XP.split(path, '.');

            // Enforcing
            parts.forEach(function (part, i) {
                force   = !current[part] || typeof current[part] !== 'object';
                current = current[part] = i + 1 === parts.length ? value : (force ? {} : current[part]);
            });

            // Notifying
            self.notifyPath(path, value);

            return value;
        }
    };
(function () {

        // Vars
        var shared = {};

        // Prototype
        Polymer.XPSharedBehaviorImp = {

            /**
             * Share `value` with others.
             *
             * @method share
             * @param {string} path
             * @param {*} value
             * @returns {*}
             */
            share: function (path, value) {

                // Asserting
                XP.assertArgument(XP.isString(path, true), 1, 'string');

                // Vars
                var self = this;

                // Enforcing
                self.enforce('shared.' + path, value);

                // Notifying
                self.notifyOthers('sharers', 'shared.' + path, value);

                return value;
            },

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The shared data.
                 *
                 * @attribute shared
                 * @type Object
                 * @default {}
                 * @notifies
                 * @readonly
                 */
                shared: {
                    notify: true,
                    readOnly: true,
                    value: shared
                }
            },

            /**
             * The list of sharers.
             *
             * @property sharers
             * @type Array
             * @default []
             * @readonly
             */
            sharers: [],

            /*********************************************************************/

            // LISTENER
            ready: function () {

                // Appending
                this.append('sharers', this);
            }
        };

        Polymer.XPSharedBehavior = [
            Polymer.XPArrayBehavior,
            Polymer.XPObjectBehavior,
            Polymer.XPRefirerBehavior,
            Polymer.XPSharedBehaviorImp
        ];
    }());
Polymer.XPShellBehaviorImp = {

        // PROPERTIES
        properties: {

            /**
             * The current locale's language.
             *
             * @attribute language
             * @type string
             * @notifies
             */
            language: {
                notify: true,
                observer: '_languageObserver',
                type: String,
                value: navigator.language.slice(0, 2)
            }
        },

        /*********************************************************************/

        // OBSERVER
        _languageObserver: function () {

            // Sharing
            this.share('language', this.language || null);
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('shell');
        }
    };

    Polymer.XPShellBehavior = [
        Polymer.XPSharedBehavior,
        Polymer.XPShellBehaviorImp
    ];
Polymer.XPTabsBehaviorImp = {

        /**
         * Fired when a tab is closing.
         *
         * @event xp-tab-close
         * @param {Element} firer
         * @param {number | string} index
         * @param {boolean} isActive
         * @param {boolean} isModified
         * @bubbles
         * @cancelable
         */

        /*********************************************************************/

        /**
         * Closes a tab.
         *
         * @method close
         * @param {Element | Function | number | string} identity
         * @returns {Element}
         */
        close: function (identity) {

            // Vars
            var self       = this,
                item       = self.findItem(identity),
                index      = self.findIndex(item, true),
                isSelected = self.isSelected(item, true),
                target     = self.findTarget();

            // Checking
            if (!item || !item.closable) { return null; }

            // Firing
            if (self.fire('xp-tab-close', {firer: item, index: index, isActive: !!item.active, isModified: !!item.modified}, {cancelable: true}).defaultPrevented) { return null; }

            // Propagating
            if (target && target.close && !target.close(index)) { return null; }

            // Selecting
            if (isSelected && self.items.length > 1) { self[XP.isLast(item, self.items) ? 'selectPrevious' : 'selectNext'](); }

            // Removing
            return Polymer.dom(Polymer.dom(item).parentNode).removeChild(item);
        },

        /**
         * Opens a tab.
         *
         * @method open
         * @param {Object} [properties]
         * @param {boolean} [autoSelect = false]
         * @returns {Element}
         */
        open: function (properties, autoSelect) {

            // Vars
            var self = this;

            // Frame 1
            requestAnimationFrame(function () {

                // Vars
                var item   = self.itemTag && document.createElement(self.itemTag),
                    tab    = item && XP.assign(item, properties, {closable: true}),
                    target = item && self.findTarget();

                // Appending
                if (tab) { self.append('items', Polymer.dom(self).appendChild(tab)); } else { return null; }

                // Propagating
                if (target && target.open) { tab.target = target.open({content: tab.content, data: tab.data}); }

                // Selecting
                if (autoSelect) { requestAnimationFrame(self.select.bind(self, tab, true)); }
            });

            return self;
        },

        /**
         * Slides to the left.
         *
         * @method slideLeft
         * @returns {Element}
         */
        slideLeft: function () {

            // Sliding
            return this.slideTo(XP.findLast(this.items, this._bleedsLeft.bind(this)));
        },

        /**
         * Slides to the right.
         *
         * @method slideRight
         * @returns {Element}
         */
        slideRight: function () {

            // Sliding
            return this.slideTo(XP.find(this.items, this._bleedsRight.bind(this)));
        },

        /**
         * Slides to a tab.
         *
         * @method slideTo
         * @param {Element | Function | number | string} identity
         * @returns {Element}
         */
        slideTo: function (identity) {

            // Vars
            var self = this,
                item = self.findItem(identity);

            // Scrolling
            if (item) { self.slider.scrollLeft = item.offsetLeft - (self.slider.clientWidth / 2) + (item.clientWidth / 2); }

            // Updating
            if (item) { self._scrolledObserver(); }

            return item;
        },

        /*********************************************************************/

        /**
         * Returns true if the tab is bleeding out of the slider's left side.
         *
         * @method _bleedsLeft
         * @param {Element} item
         * @returns {boolean}
         * @private
         */
        _bleedsLeft: function (item) {
            return item.offsetLeft < this.slider.scrollLeft;
        },

        /**
         * Returns true if the tab is bleeding out of the slider's right side.
         *
         * @method _bleedsRight
         * @param {Element} item
         * @returns {boolean}
         * @private
         */
        _bleedsRight: function (item) {
            return item.offsetLeft + item.clientWidth > this.slider.scrollLeft + this.slider.clientWidth;
        },

        /*********************************************************************/

        // OBSERVERS
        observers: [
            '_scrolledObserver(scrolled, slider)'
        ],

        // PROPERTIES
        properties: {

            /**
             * The index of the item to select by default.
             *
             * @attribute default-selected
             * @type number | string
             * @default 0
             */
            defaultSelected: {
                value: 0
            },

            /**
             * The selector used to recognize items.
             *
             * @attribute item-selector
             * @type string
             * @default ".tab"
             */
            itemSelector: {
                reflectToAttribute: true,
                type: String,
                value: '.tab'
            },

            /**
             * The tag used to append new items.
             *
             * @attribute item-tag
             * @type string
             * @readonly
             */
            itemTag: {
                readOnly: true,
                type: String
            },

            /**
             * The found items.
             *
             * @attribute items
             * @type Array
             * @notifies
             */
            items: {
                value: function () { return []; }
            },

            /**
             * If set to true, the tabs can be slided on the left.
             *
             * @attribute more-left
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            moreLeft: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the tabs can be slided on the right.
             *
             * @attribute more-right
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            moreRight: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * If set to true, the tabs container is scrollable.
             *
             * @attribute scrollable
             * @type boolean
             * @default false
             */
            scrollable: {
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The tabs scroll amount.
             *
             * @attribute scrolled
             * @type number
             * @default 0
             * @notifies
             * @readonly
             */
            scrolled: {
                notify: true,
                readOnly: true,
                type: Number,
                value: 0
            },

            /**
             * If set to true, the items will be selected on tap.
             *
             * @attribute selectable
             * @type boolean
             * @default true
             */
            selectable: {
                reflectToAttribute: true,
                type: Boolean,
                value: true
            },

            /**
             * The tabs slider.
             *
             * @attribute slider
             * @type Element
             * @notifies
             * @readonly
             */
            slider: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the track event is running.
             *
             * @attribute tracking
             * @type boolean
             * @notifies
             * @readonly
             */
            tracking: {
                notify: true,
                readOnly: true,
                type: Boolean,
                value: false
            }
        },

        /*********************************************************************/

        // OBSERVER
        _scrolledObserver: function () {

            // Vars
            var self = this;

            // Setting
            self._setScrolled(self.slider.scrollLeft);
            self._setMoreLeft(self.scrolled > 0);
            self._setMoreRight(self.scrolled + self.slider.clientWidth < self.slider.scrollWidth);
        },

        /*********************************************************************/

        // LISTENER
        attached: function () {

            // Mutating
            Polymer.XPTabsBehaviorImp.mutated.apply(this);
        },

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('tabs');
        },

        // LISTENER
        mutated: function () {

            // Vars
            var self = this;

            // Handling
            self._mutationHandler();

            // Observing
            XP.onMutation(self, Polymer.XPTabsBehaviorImp.mutated.bind(self), {attributes: true, childList: true, subtree: true});
        },

        // LISTENER
        ready: function () {

            // Vars
            var self = this;

            // Mapping
            self.slavesMap.items = '.tab';

            // Setting
            self._setSlider(Polymer.dom(self.root).querySelector('.slider'));
        },

        /*********************************************************************/

        // HANDLER
        _closeHandler: function (event) {

            // Vars
            var self = this;

            // Stopping
            event.stopPropagation();

            // Closing
            self.close(event.detail.firer);
        },

        // HANDLER
        _mutationHandler: function () {

            // Updating
            this._scrolledObserver();
        },

        // HANDLER
        _trackHandler: function (event) {

            // Vars
            var self = this;

            // Scrolling
            self.slider.scrollLeft -= event.detail.ddx || 0;

            // Updating
            self._scrolledObserver();

            // Checking
            if (event.detail.state === 'track') { return; }

            // Frame 1
            requestAnimationFrame(self._setTracking.bind(self, event.detail.state === 'start'));
        }
    };

    Polymer.XPTabsBehavior = [
        Polymer.XPMasterBehavior,
        Polymer.XPSelectorBehavior,
        Polymer.XPTabsBehaviorImp
    ];
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XPObserver = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*jslint browser: true, devel: true, node: true, ass: true, nomen: true, unparam: true, indent: 4 */

module.exports = _dereq_('./lib');
},{"./lib":2}],2:[function(_dereq_,module,exports){
(function (global){
/*jslint browser: true, devel: true, node: true, ass: true, nomen: true, unparam: true, indent: 4 */

/**
 * @license
 * Copyright (c) 2015 The ExpandJS authors. All rights reserved.
 * This code may only be used under the BSD style license found at https://expandjs.github.io/LICENSE.txt
 * The complete set of authors may be found at https://expandjs.github.io/AUTHORS.txt
 * The complete set of contributors may be found at https://expandjs.github.io/CONTRIBUTORS.txt
 */
(function (global) {
    "use strict";

    // Vars
    var XP       = global.XP || _dereq_('expandjs'),
        Observer = _dereq_('observe-js').ObjectObserver;

    /*********************************************************************/

    /**
     * This class is used to provide object observing functionality.
     *
     * @class XPObserver
     * @description This class is used to provide object observing functionality
     */
    module.exports = global.XPObserver = new XP.Class('XPObserver', {

        /**
         * @constructs
         * @param {Array | Function | Object} value
         * @param {Function} callback
         * @param {boolean} [deep = false]
         */
        initialize: function (value, callback, deep) {

            // Asserting
            XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
            XP.assertArgument(XP.isFunction(callback), 2, 'Function');

            // Vars
            var self = this;

            // Setting
            self.value      = value;
            self.callback   = callback;
            self.deep       = deep;
            self._observers = [];

            // Observing
            self._addObserver(self.value);

            return self;
        },

        /*********************************************************************/

        /**
         * Disconnects the observer.
         *
         * @method disconnect
         * @returns {Object}
         */
        disconnect: function () {
            var self = this;
            self._removeObserver(self.value);
            return self;
        },

        /*********************************************************************/

        /**
         * Adds the observer for value.
         *
         * @method _addObserver
         * @param {Array | Function | Object} value
         * @param {Array | Object} [wrapper]
         * @returns {Object}
         * @private
         */
        _addObserver: {
            enumerable: false,
            value: function (value, wrapper) {

                // Asserting
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
                XP.assertArgument(XP.isVoid(wrapper) || XP.isCollection(wrapper), 2, 'Array or Object');

                // Vars
                var self     = this,
                    observe  = function (sub) { return XP.isObservable(sub) ? self._addObserver(sub, value) : undefined; },
                    observer = !self._isObserved(value) && (!wrapper || XP.includesDeep(wrapper, value)) && self._connectObserver(new Observer(value));

                // Checking
                if (!observer) { return self; }

                // Adding
                if (value === self.value) { self._observer = observer; } else { XP.push(self._observers, observer); }
                if (self.deep && XP.isCollection(value)) { XP[XP.isArray(value) ? 'forEach' : 'forOwn'](value, observe); }

                return self;
            }
        },

        /**
         * Connects an observer.
         *
         * @method _connectObserver
         * @param {Object} observer
         * @returns {Object}
         * @private
         */
        _connectObserver: {
            enumerable: false,
            value: function (observer) {

                // Asserting
                XP.assertArgument(XP.isObject(observer), 1, 'Object');

                // Vars
                var self     = this,
                    value    = self._getObserved(observer),
                    callback = function (added, removed, changed, getOld) {

                        // Updating
                        XP.forEach(added,   function (sub)      { return XP.isObservable(sub) ? self._addObserver(sub, value) : undefined; });
                        XP.forEach(changed, function (sub, key) { return XP.isObservable(sub) ? self._removeObserver(getOld(key))._addObserver(sub, value) : undefined; });
                        XP.forEach(removed, function (sub, key) { return XP.isObservable(getOld(key)) ? self._removeObserver(getOld(key)) : undefined; });

                        return self.callback(self.value);
                    };

                // Opening
                observer.open(callback);

                return observer;
            }
        },

        /**
         * Returns the value of observer.
         *
         * @method _getObserved
         * @param {Object} observer
         * @returns {Array | Object}
         * @private
         */
        _getObserved: {
            enumerable: false,
            value: function (observer) {
                XP.assertArgument(XP.isObject(observer), 1, 'Object');
                return observer.value_;
            }
        },

        /**
         * Returns the observer of value.
         *
         * @method _getObserver
         * @param {Array | Function | Object} value
         * @returns {Object | undefined}
         * @private
         */
        _getObserver: {
            enumerable: false,
            value: function (value) {
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
                return XP.find(this._observers, function (observer) { return observer.value_ === value; });
            }
        },

        /**
         * Returns true if value is observed.
         *
         * @method _isObserved
         * @param {Array | Function | Object} value
         * @returns {boolean}
         * @private
         */
        _isObserved: {
            enumerable: false,
            value: function (value) {
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');
                return value === this.value ? !!this._observer : !!this._getObserver(value);
            }
        },

        /**
         * Removes the observer of value.
         *
         * @method _removeObserver
         * @param {Array | Function | Object} value
         * @returns {Object}
         * @private
         */
        _removeObserver: {
            enumerable: false,
            value: function (value) {

                // Asserting
                XP.assertArgument(XP.isObservable(value), 1, 'Array, Function or Object');

                // Vars
                var self     = this,
                    observe  = function (sub) { return XP.isObservable(sub) ? self._removeObserver(sub) : undefined; },
                    observer = !XP.includesDeep(self.value, value) && self._getObserver(value);

                // Closing
                if (observer) { observer.close(); } else { return self; }

                // Removing
                if (value === self.value) { self._observer = observer; } else { XP.pull(self._observers, observer); }
                if (self.deep && XP.isCollection(value)) { XP[XP.isArray(value) ? 'forEach' : 'forOwn'](value, observe); }

                return self;
            }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property callback
         * @type Function
         */
        callback: {
            set: function (val) { return this.callback || val; },
            validate: function (val) { return !XP.isFunction(val) && 'Function'; }
        },

        /**
         * TODO DOC
         *
         * @property deep
         * @type boolean
         */
        deep: {
            set: function (val) { return !!val; }
        },

        /**
         * TODO DOC
         *
         * @property value
         * @type Array | Function | Object
         */
        value: {
            set: function (val) { return this.value || val; },
            validate: function (val) { return !XP.isObservable(val) && 'Array, Function or Object'; }
        },

        /*********************************************************************/

        /**
         * TODO DOC
         *
         * @property _observer
         * @type Object
         * @private
         */
        _observer: {
            enumerable: false,
            set: function (val) { return this._observer || val; },
            validate: function (val) { return !XP.isObject(val) && 'Object'; }
        },

        /**
         * TODO DOC
         *
         * @property _observers
         * @type Array
         * @private
         */
        _observers: {
            enumerable: false,
            set: function (val) { return this._observers || val; },
            validate: function (val) { return !XP.isArray(val) && 'Array'; }
        }
    });

}(typeof window !== "undefined" ? window : global));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"expandjs":4,"observe-js":3}],3:[function(_dereq_,module,exports){
(function (global){
/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(global) {
  'use strict';

  var testingExposeCycleCount = global.testingExposeCycleCount;

  // Detect and do basic sanity checking on Object/Array.observe.
  function detectObjectObserve() {
    if (typeof Object.observe !== 'function' ||
        typeof Array.observe !== 'function') {
      return false;
    }

    var records = [];

    function callback(recs) {
      records = recs;
    }

    var test = {};
    var arr = [];
    Object.observe(test, callback);
    Array.observe(arr, callback);
    test.id = 1;
    test.id = 2;
    delete test.id;
    arr.push(1, 2);
    arr.length = 0;

    Object.deliverChangeRecords(callback);
    if (records.length !== 5)
      return false;

    if (records[0].type != 'add' ||
        records[1].type != 'update' ||
        records[2].type != 'delete' ||
        records[3].type != 'splice' ||
        records[4].type != 'splice') {
      return false;
    }

    Object.unobserve(test, callback);
    Array.unobserve(arr, callback);

    return true;
  }

  var hasObserve = detectObjectObserve();

  function detectEval() {
    // Don't test for eval if we're running in a Chrome App environment.
    // We check for APIs set that only exist in a Chrome App context.
    if (typeof chrome !== 'undefined' && chrome.app && chrome.app.runtime) {
      return false;
    }

    // Firefox OS Apps do not allow eval. This feature detection is very hacky
    // but even if some other platform adds support for this function this code
    // will continue to work.
    if (typeof navigator != 'undefined' && navigator.getDeviceStorage) {
      return false;
    }

    try {
      var f = new Function('', 'return true;');
      return f();
    } catch (ex) {
      return false;
    }
  }

  var hasEval = detectEval();

  function isIndex(s) {
    return +s === s >>> 0 && s !== '';
  }

  function toNumber(s) {
    return +s;
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var numberIsNaN = global.Number.isNaN || function(value) {
    return typeof value === 'number' && global.isNaN(value);
  };

  function areSameValue(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    if (numberIsNaN(left) && numberIsNaN(right))
      return true;

    return left !== left && right !== right;
  }

  var createObject = ('__proto__' in {}) ?
    function(obj) { return obj; } :
    function(obj) {
      var proto = obj.__proto__;
      if (!proto)
        return obj;
      var newObject = Object.create(proto);
      Object.getOwnPropertyNames(obj).forEach(function(name) {
        Object.defineProperty(newObject, name,
                             Object.getOwnPropertyDescriptor(obj, name));
      });
      return newObject;
    };

  var identStart = '[\$_a-zA-Z]';
  var identPart = '[\$_a-zA-Z0-9]';
  var identRegExp = new RegExp('^' + identStart + '+' + identPart + '*' + '$');

  function getPathCharType(char) {
    if (char === undefined)
      return 'eof';

    var code = char.charCodeAt(0);

    switch(code) {
      case 0x5B: // [
      case 0x5D: // ]
      case 0x2E: // .
      case 0x22: // "
      case 0x27: // '
      case 0x30: // 0
        return char;

      case 0x5F: // _
      case 0x24: // $
        return 'ident';

      case 0x20: // Space
      case 0x09: // Tab
      case 0x0A: // Newline
      case 0x0D: // Return
      case 0xA0:  // No-break space
      case 0xFEFF:  // Byte Order Mark
      case 0x2028:  // Line Separator
      case 0x2029:  // Paragraph Separator
        return 'ws';
    }

    // a-z, A-Z
    if ((0x61 <= code && code <= 0x7A) || (0x41 <= code && code <= 0x5A))
      return 'ident';

    // 1-9
    if (0x31 <= code && code <= 0x39)
      return 'number';

    return 'else';
  }

  var pathStateMachine = {
    'beforePath': {
      'ws': ['beforePath'],
      'ident': ['inIdent', 'append'],
      '[': ['beforeElement'],
      'eof': ['afterPath']
    },

    'inPath': {
      'ws': ['inPath'],
      '.': ['beforeIdent'],
      '[': ['beforeElement'],
      'eof': ['afterPath']
    },

    'beforeIdent': {
      'ws': ['beforeIdent'],
      'ident': ['inIdent', 'append']
    },

    'inIdent': {
      'ident': ['inIdent', 'append'],
      '0': ['inIdent', 'append'],
      'number': ['inIdent', 'append'],
      'ws': ['inPath', 'push'],
      '.': ['beforeIdent', 'push'],
      '[': ['beforeElement', 'push'],
      'eof': ['afterPath', 'push']
    },

    'beforeElement': {
      'ws': ['beforeElement'],
      '0': ['afterZero', 'append'],
      'number': ['inIndex', 'append'],
      "'": ['inSingleQuote', 'append', ''],
      '"': ['inDoubleQuote', 'append', '']
    },

    'afterZero': {
      'ws': ['afterElement', 'push'],
      ']': ['inPath', 'push']
    },

    'inIndex': {
      '0': ['inIndex', 'append'],
      'number': ['inIndex', 'append'],
      'ws': ['afterElement'],
      ']': ['inPath', 'push']
    },

    'inSingleQuote': {
      "'": ['afterElement'],
      'eof': ['error'],
      'else': ['inSingleQuote', 'append']
    },

    'inDoubleQuote': {
      '"': ['afterElement'],
      'eof': ['error'],
      'else': ['inDoubleQuote', 'append']
    },

    'afterElement': {
      'ws': ['afterElement'],
      ']': ['inPath', 'push']
    }
  };

  function noop() {}

  function parsePath(path) {
    var keys = [];
    var index = -1;
    var c, newChar, key, type, transition, action, typeMap, mode = 'beforePath';

    var actions = {
      push: function() {
        if (key === undefined)
          return;

        keys.push(key);
        key = undefined;
      },

      append: function() {
        if (key === undefined)
          key = newChar;
        else
          key += newChar;
      }
    };

    function maybeUnescapeQuote() {
      if (index >= path.length)
        return;

      var nextChar = path[index + 1];
      if ((mode == 'inSingleQuote' && nextChar == "'") ||
          (mode == 'inDoubleQuote' && nextChar == '"')) {
        index++;
        newChar = nextChar;
        actions.append();
        return true;
      }
    }

    while (mode) {
      index++;
      c = path[index];

      if (c == '\\' && maybeUnescapeQuote(mode))
        continue;

      type = getPathCharType(c);
      typeMap = pathStateMachine[mode];
      transition = typeMap[type] || typeMap['else'] || 'error';

      if (transition == 'error')
        return; // parse error;

      mode = transition[0];
      action = actions[transition[1]] || noop;
      newChar = transition[2] === undefined ? c : transition[2];
      action();

      if (mode === 'afterPath') {
        return keys;
      }
    }

    return; // parse error
  }

  function isIdent(s) {
    return identRegExp.test(s);
  }

  var constructorIsPrivate = {};

  function Path(parts, privateToken) {
    if (privateToken !== constructorIsPrivate)
      throw Error('Use Path.get to retrieve path objects');

    for (var i = 0; i < parts.length; i++) {
      this.push(String(parts[i]));
    }

    if (hasEval && this.length) {
      this.getValueFrom = this.compiledGetValueFromFn();
    }
  }

  // TODO(rafaelw): Make simple LRU cache
  var pathCache = {};

  function getPath(pathString) {
    if (pathString instanceof Path)
      return pathString;

    if (pathString == null || pathString.length == 0)
      pathString = '';

    if (typeof pathString != 'string') {
      if (isIndex(pathString.length)) {
        // Constructed with array-like (pre-parsed) keys
        return new Path(pathString, constructorIsPrivate);
      }

      pathString = String(pathString);
    }

    var path = pathCache[pathString];
    if (path)
      return path;

    var parts = parsePath(pathString);
    if (!parts)
      return invalidPath;

    path = new Path(parts, constructorIsPrivate);
    pathCache[pathString] = path;
    return path;
  }

  Path.get = getPath;

  function formatAccessor(key) {
    if (isIndex(key)) {
      return '[' + key + ']';
    } else {
      return '["' + key.replace(/"/g, '\\"') + '"]';
    }
  }

  Path.prototype = createObject({
    __proto__: [],
    valid: true,

    toString: function() {
      var pathString = '';
      for (var i = 0; i < this.length; i++) {
        var key = this[i];
        if (isIdent(key)) {
          pathString += i ? '.' + key : key;
        } else {
          pathString += formatAccessor(key);
        }
      }

      return pathString;
    },

    getValueFrom: function(obj, defaultValue) {
      for (var i = 0; i < this.length; i++) {
        var key = this[i];
        if (obj == null || !(key in obj))
          return defaultValue;
        obj = obj[key];
      }
      return obj;
    },

    iterateObjects: function(obj, observe) {
      for (var i = 0; i < this.length; i++) {
        if (i)
          obj = obj[this[i - 1]];
        if (!isObject(obj))
          return;
        observe(obj, this[i]);
      }
    },

    compiledGetValueFromFn: function() {
      var str = '';
      var pathString = 'obj';
      str += 'if (obj != null';
      var i = 0;
      var key;
      for (; i < (this.length - 1); i++) {
        key = this[i];
        pathString += isIdent(key) ? '.' + key : formatAccessor(key);
        str += ' &&\n    ' + pathString + ' != null';
      }

      key = this[i];
      var keyIsIdent = isIdent(key);
      var keyForInOperator = keyIsIdent ? '"' + key.replace(/"/g, '\\"') + '"' : key;
      str += ' &&\n    ' + keyForInOperator + ' in ' + pathString + ')\n';
      pathString += keyIsIdent ? '.' + key : formatAccessor(key);

      str += '  return ' + pathString + ';\nelse\n  return defaultValue;';
      return new Function('obj', 'defaultValue', str);
    },

    setValueFrom: function(obj, value) {
      if (!this.length)
        return false;

      for (var i = 0; i < this.length - 1; i++) {
        if (!isObject(obj))
          return false;
        obj = obj[this[i]];
      }

      if (!isObject(obj))
        return false;

      obj[this[i]] = value;
      return true;
    }
  });

  var invalidPath = new Path('', constructorIsPrivate);
  invalidPath.valid = false;
  invalidPath.getValueFrom = invalidPath.setValueFrom = function() {};

  var MAX_DIRTY_CHECK_CYCLES = 1000;

  function dirtyCheck(observer) {
    var cycles = 0;
    while (cycles < MAX_DIRTY_CHECK_CYCLES && observer.check_()) {
      cycles++;
    }
    if (testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    return cycles > 0;
  }

  function objectIsEmpty(object) {
    for (var prop in object)
      return false;
    return true;
  }

  function diffIsEmpty(diff) {
    return objectIsEmpty(diff.added) &&
           objectIsEmpty(diff.removed) &&
           objectIsEmpty(diff.changed);
  }

  function diffObjectFromOldObject(object, oldObject) {
    var added = {};
    var removed = {};
    var changed = {};
    var prop;

    for (prop in oldObject) {
      var newValue = object[prop];

      if (newValue !== undefined && newValue === oldObject[prop])
        continue;

      if (!(prop in object)) {
        removed[prop] = undefined;
        continue;
      }

      if (newValue !== oldObject[prop])
        changed[prop] = newValue;
    }

    for (prop in object) {
      if (prop in oldObject)
        continue;

      added[prop] = object[prop];
    }

    if (Array.isArray(object) && object.length !== oldObject.length)
      changed.length = object.length;

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  var eomTasks = [];
  function runEOMTasks() {
    if (!eomTasks.length)
      return false;

    for (var i = 0; i < eomTasks.length; i++) {
      eomTasks[i]();
    }
    eomTasks.length = 0;
    return true;
  }

  var runEOM = hasObserve ? (function(){
    return function(fn) {
      return Promise.resolve().then(fn);
    };
  })() :
  (function() {
    return function(fn) {
      eomTasks.push(fn);
    };
  })();

  var observedObjectCache = [];

  function newObservedObject() {
    var observer;
    var object;
    var discardRecords = false;
    var first = true;

    function callback(records) {
      if (observer && observer.state_ === OPENED && !discardRecords)
        observer.check_(records);
    }

    return {
      open: function(obs) {
        if (observer)
          throw Error('ObservedObject in use');

        if (!first)
          Object.deliverChangeRecords(callback);

        observer = obs;
        first = false;
      },
      observe: function(obj, arrayObserve) {
        object = obj;
        if (arrayObserve)
          Array.observe(object, callback);
        else
          Object.observe(object, callback);
      },
      deliver: function(discard) {
        discardRecords = discard;
        Object.deliverChangeRecords(callback);
        discardRecords = false;
      },
      close: function() {
        observer = undefined;
        Object.unobserve(object, callback);
        observedObjectCache.push(this);
      }
    };
  }

  /*
   * The observedSet abstraction is a perf optimization which reduces the total
   * number of Object.observe observations of a set of objects. The idea is that
   * groups of Observers will have some object dependencies in common and this
   * observed set ensures that each object in the transitive closure of
   * dependencies is only observed once. The observedSet acts as a write barrier
   * such that whenever any change comes through, all Observers are checked for
   * changed values.
   *
   * Note that this optimization is explicitly moving work from setup-time to
   * change-time.
   *
   * TODO(rafaelw): Implement "garbage collection". In order to move work off
   * the critical path, when Observers are closed, their observed objects are
   * not Object.unobserve(d). As a result, it's possible that if the observedSet
   * is kept open, but some Observers have been closed, it could cause "leaks"
   * (prevent otherwise collectable objects from being collected). At some
   * point, we should implement incremental "gc" which keeps a list of
   * observedSets which may need clean-up and does small amounts of cleanup on a
   * timeout until all is clean.
   */

  function getObservedObject(observer, object, arrayObserve) {
    var dir = observedObjectCache.pop() || newObservedObject();
    dir.open(observer);
    dir.observe(object, arrayObserve);
    return dir;
  }

  var observedSetCache = [];

  function newObservedSet() {
    var observerCount = 0;
    var observers = [];
    var objects = [];
    var rootObj;
    var rootObjProps;

    function observe(obj, prop) {
      if (!obj)
        return;

      if (obj === rootObj)
        rootObjProps[prop] = true;

      if (objects.indexOf(obj) < 0) {
        objects.push(obj);
        Object.observe(obj, callback);
      }

      observe(Object.getPrototypeOf(obj), prop);
    }

    function allRootObjNonObservedProps(recs) {
      for (var i = 0; i < recs.length; i++) {
        var rec = recs[i];
        if (rec.object !== rootObj ||
            rootObjProps[rec.name] ||
            rec.type === 'setPrototype') {
          return false;
        }
      }
      return true;
    }

    function callback(recs) {
      if (allRootObjNonObservedProps(recs))
        return;

      var i, observer;
      for (i = 0; i < observers.length; i++) {
        observer = observers[i];
        if (observer.state_ == OPENED) {
          observer.iterateObjects_(observe);
        }
      }

      for (i = 0; i < observers.length; i++) {
        observer = observers[i];
        if (observer.state_ == OPENED) {
          observer.check_();
        }
      }
    }

    var record = {
      objects: objects,
      get rootObject() { return rootObj; },
      set rootObject(value) {
        rootObj = value;
        rootObjProps = {};
      },
      open: function(obs, object) {
        observers.push(obs);
        observerCount++;
        obs.iterateObjects_(observe);
      },
      close: function(obs) {
        observerCount--;
        if (observerCount > 0) {
          return;
        }

        for (var i = 0; i < objects.length; i++) {
          Object.unobserve(objects[i], callback);
          Observer.unobservedCount++;
        }

        observers.length = 0;
        objects.length = 0;
        rootObj = undefined;
        rootObjProps = undefined;
        observedSetCache.push(this);
        if (lastObservedSet === this)
          lastObservedSet = null;
      },
    };

    return record;
  }

  var lastObservedSet;

  function getObservedSet(observer, obj) {
    if (!lastObservedSet || lastObservedSet.rootObject !== obj) {
      lastObservedSet = observedSetCache.pop() || newObservedSet();
      lastObservedSet.rootObject = obj;
    }
    lastObservedSet.open(observer, obj);
    return lastObservedSet;
  }

  var UNOPENED = 0;
  var OPENED = 1;
  var CLOSED = 2;
  var RESETTING = 3;

  var nextObserverId = 1;

  function Observer() {
    this.state_ = UNOPENED;
    this.callback_ = undefined;
    this.target_ = undefined; // TODO(rafaelw): Should be WeakRef
    this.directObserver_ = undefined;
    this.value_ = undefined;
    this.id_ = nextObserverId++;
  }

  Observer.prototype = {
    open: function(callback, target) {
      if (this.state_ != UNOPENED)
        throw Error('Observer has already been opened.');

      addToAll(this);
      this.callback_ = callback;
      this.target_ = target;
      this.connect_();
      this.state_ = OPENED;
      return this.value_;
    },

    close: function() {
      if (this.state_ != OPENED)
        return;

      removeFromAll(this);
      this.disconnect_();
      this.value_ = undefined;
      this.callback_ = undefined;
      this.target_ = undefined;
      this.state_ = CLOSED;
    },

    deliver: function() {
      if (this.state_ != OPENED)
        return;

      dirtyCheck(this);
    },

    report_: function(changes) {
      try {
        this.callback_.apply(this.target_, changes);
      } catch (ex) {
        Observer._errorThrownDuringCallback = true;
        console.error('Exception caught during observer callback: ' +
                       (ex.stack || ex));
      }
    },

    discardChanges: function() {
      this.check_(undefined, true);
      return this.value_;
    }
  };

  var collectObservers = !hasObserve;
  var allObservers;
  Observer._allObserversCount = 0;

  if (collectObservers) {
    allObservers = [];
  }

  function addToAll(observer) {
    Observer._allObserversCount++;
    if (!collectObservers)
      return;

    allObservers.push(observer);
  }

  function removeFromAll(observer) {
    Observer._allObserversCount--;
  }

  var runningMicrotaskCheckpoint = false;

  global.Platform = global.Platform || {};

  global.Platform.performMicrotaskCheckpoint = function() {
    if (runningMicrotaskCheckpoint)
      return;

    if (!collectObservers)
      return;

    runningMicrotaskCheckpoint = true;

    var cycles = 0;
    var anyChanged, toCheck;

    do {
      cycles++;
      toCheck = allObservers;
      allObservers = [];
      anyChanged = false;

      for (var i = 0; i < toCheck.length; i++) {
        var observer = toCheck[i];
        if (observer.state_ != OPENED)
          continue;

        if (observer.check_())
          anyChanged = true;

        allObservers.push(observer);
      }
      if (runEOMTasks())
        anyChanged = true;
    } while (cycles < MAX_DIRTY_CHECK_CYCLES && anyChanged);

    if (testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    runningMicrotaskCheckpoint = false;
  };

  if (collectObservers) {
    global.Platform.clearObservers = function() {
      allObservers = [];
    };
  }

  function ObjectObserver(object) {
    Observer.call(this);
    this.value_ = object;
    this.oldObject_ = undefined;
  }

  ObjectObserver.prototype = createObject({
    __proto__: Observer.prototype,

    arrayObserve: false,

    connect_: function(callback, target) {
      if (hasObserve) {
        this.directObserver_ = getObservedObject(this, this.value_,
                                                 this.arrayObserve);
      } else {
        this.oldObject_ = this.copyObject(this.value_);
      }

    },

    copyObject: function(object) {
      var copy = Array.isArray(object) ? [] : {};
      for (var prop in object) {
        copy[prop] = object[prop];
      }
      if (Array.isArray(object))
        copy.length = object.length;
      return copy;
    },

    check_: function(changeRecords, skipChanges) {
      var diff;
      var oldValues;
      if (hasObserve) {
        if (!changeRecords)
          return false;

        oldValues = {};
        diff = diffObjectFromChangeRecords(this.value_, changeRecords,
                                           oldValues);
      } else {
        oldValues = this.oldObject_;
        diff = diffObjectFromOldObject(this.value_, this.oldObject_);
      }

      if (diffIsEmpty(diff))
        return false;

      if (!hasObserve)
        this.oldObject_ = this.copyObject(this.value_);

      this.report_([
        diff.added || {},
        diff.removed || {},
        diff.changed || {},
        function(property) {
          return oldValues[property];
        }
      ]);

      return true;
    },

    disconnect_: function() {
      if (hasObserve) {
        this.directObserver_.close();
        this.directObserver_ = undefined;
      } else {
        this.oldObject_ = undefined;
      }
    },

    deliver: function() {
      if (this.state_ != OPENED)
        return;

      if (hasObserve)
        this.directObserver_.deliver(false);
      else
        dirtyCheck(this);
    },

    discardChanges: function() {
      if (this.directObserver_)
        this.directObserver_.deliver(true);
      else
        this.oldObject_ = this.copyObject(this.value_);

      return this.value_;
    }
  });

  function ArrayObserver(array) {
    if (!Array.isArray(array))
      throw Error('Provided object is not an Array');
    ObjectObserver.call(this, array);
  }

  ArrayObserver.prototype = createObject({

    __proto__: ObjectObserver.prototype,

    arrayObserve: true,

    copyObject: function(arr) {
      return arr.slice();
    },

    check_: function(changeRecords) {
      var splices;
      if (hasObserve) {
        if (!changeRecords)
          return false;
        splices = projectArraySplices(this.value_, changeRecords);
      } else {
        splices = calcSplices(this.value_, 0, this.value_.length,
                              this.oldObject_, 0, this.oldObject_.length);
      }

      if (!splices || !splices.length)
        return false;

      if (!hasObserve)
        this.oldObject_ = this.copyObject(this.value_);

      this.report_([splices]);
      return true;
    }
  });

  ArrayObserver.applySplices = function(previous, current, splices) {
    splices.forEach(function(splice) {
      var spliceArgs = [splice.index, splice.removed.length];
      var addIndex = splice.index;
      while (addIndex < splice.index + splice.addedCount) {
        spliceArgs.push(current[addIndex]);
        addIndex++;
      }

      Array.prototype.splice.apply(previous, spliceArgs);
    });
  };

  function PathObserver(object, path, defaultValue) {
    Observer.call(this);

    this.object_ = object;
    this.path_ = getPath(path);
    this.defaultValue_ = defaultValue;
    this.directObserver_ = undefined;
  }

  PathObserver.prototype = createObject({
    __proto__: Observer.prototype,

    get path() {
      return this.path_;
    },

    connect_: function() {
      if (hasObserve)
        this.directObserver_ = getObservedSet(this, this.object_);

      this.check_(undefined, true);
    },

    disconnect_: function() {
      this.value_ = undefined;

      if (this.directObserver_) {
        this.directObserver_.close(this);
        this.directObserver_ = undefined;
      }
    },

    iterateObjects_: function(observe) {
      this.path_.iterateObjects(this.object_, observe);
    },

    check_: function(changeRecords, skipChanges) {
      var oldValue = this.value_;
      this.value_ = this.path_.getValueFrom(this.object_, this.defaultValue_);
      if (skipChanges || areSameValue(this.value_, oldValue))
        return false;

      this.report_([this.value_, oldValue, this]);
      return true;
    },

    setValue: function(newValue) {
      if (this.path_)
        this.path_.setValueFrom(this.object_, newValue);
    }
  });

  function CompoundObserver(reportChangesOnOpen) {
    Observer.call(this);

    this.reportChangesOnOpen_ = reportChangesOnOpen;
    this.value_ = [];
    this.directObserver_ = undefined;
    this.observed_ = [];
  }

  var observerSentinel = {};

  CompoundObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect_: function() {
      if (hasObserve) {
        var object;
        var needsDirectObserver = false;
        for (var i = 0; i < this.observed_.length; i += 2) {
          object = this.observed_[i];
          if (object !== observerSentinel) {
            needsDirectObserver = true;
            break;
          }
        }

        if (needsDirectObserver)
          this.directObserver_ = getObservedSet(this, object);
      }

      this.check_(undefined, !this.reportChangesOnOpen_);
    },

    disconnect_: function() {
      for (var i = 0; i < this.observed_.length; i += 2) {
        if (this.observed_[i] === observerSentinel)
          this.observed_[i + 1].close();
      }
      this.observed_.length = 0;
      this.value_.length = 0;

      if (this.directObserver_) {
        this.directObserver_.close(this);
        this.directObserver_ = undefined;
      }
    },

    addPath: function(object, path) {
      if (this.state_ != UNOPENED && this.state_ != RESETTING)
        throw Error('Cannot add paths once started.');

      path = getPath(path);
      this.observed_.push(object, path);
      if (!this.reportChangesOnOpen_)
        return;
      var index = this.observed_.length / 2 - 1;
      this.value_[index] = path.getValueFrom(object);
    },

    addObserver: function(observer) {
      if (this.state_ != UNOPENED && this.state_ != RESETTING)
        throw Error('Cannot add observers once started.');

      this.observed_.push(observerSentinel, observer);
      if (!this.reportChangesOnOpen_)
        return;
      var index = this.observed_.length / 2 - 1;
      this.value_[index] = observer.open(this.deliver, this);
    },

    startReset: function() {
      if (this.state_ != OPENED)
        throw Error('Can only reset while open');

      this.state_ = RESETTING;
      this.disconnect_();
    },

    finishReset: function() {
      if (this.state_ != RESETTING)
        throw Error('Can only finishReset after startReset');
      this.state_ = OPENED;
      this.connect_();

      return this.value_;
    },

    iterateObjects_: function(observe) {
      var object;
      for (var i = 0; i < this.observed_.length; i += 2) {
        object = this.observed_[i];
        if (object !== observerSentinel)
          this.observed_[i + 1].iterateObjects(object, observe);
      }
    },

    check_: function(changeRecords, skipChanges) {
      var oldValues;
      for (var i = 0; i < this.observed_.length; i += 2) {
        var object = this.observed_[i];
        var path = this.observed_[i+1];
        var value;
        if (object === observerSentinel) {
          var observable = path;
          value = this.state_ === UNOPENED ?
              observable.open(this.deliver, this) :
              observable.discardChanges();
        } else {
          value = path.getValueFrom(object);
        }

        if (skipChanges) {
          this.value_[i / 2] = value;
          continue;
        }

        if (areSameValue(value, this.value_[i / 2]))
          continue;

        oldValues = oldValues || [];
        oldValues[i / 2] = this.value_[i / 2];
        this.value_[i / 2] = value;
      }

      if (!oldValues)
        return false;

      // TODO(rafaelw): Having observed_ as the third callback arg here is
      // pretty lame API. Fix.
      this.report_([this.value_, oldValues, this.observed_]);
      return true;
    }
  });

  function identFn(value) { return value; }

  function ObserverTransform(observable, getValueFn, setValueFn,
                             dontPassThroughSet) {
    this.callback_ = undefined;
    this.target_ = undefined;
    this.value_ = undefined;
    this.observable_ = observable;
    this.getValueFn_ = getValueFn || identFn;
    this.setValueFn_ = setValueFn || identFn;
    // TODO(rafaelw): This is a temporary hack. PolymerExpressions needs this
    // at the moment because of a bug in it's dependency tracking.
    this.dontPassThroughSet_ = dontPassThroughSet;
  }

  ObserverTransform.prototype = {
    open: function(callback, target) {
      this.callback_ = callback;
      this.target_ = target;
      this.value_ =
          this.getValueFn_(this.observable_.open(this.observedCallback_, this));
      return this.value_;
    },

    observedCallback_: function(value) {
      value = this.getValueFn_(value);
      if (areSameValue(value, this.value_))
        return;
      var oldValue = this.value_;
      this.value_ = value;
      this.callback_.call(this.target_, this.value_, oldValue);
    },

    discardChanges: function() {
      this.value_ = this.getValueFn_(this.observable_.discardChanges());
      return this.value_;
    },

    deliver: function() {
      return this.observable_.deliver();
    },

    setValue: function(value) {
      value = this.setValueFn_(value);
      if (!this.dontPassThroughSet_ && this.observable_.setValue)
        return this.observable_.setValue(value);
    },

    close: function() {
      if (this.observable_)
        this.observable_.close();
      this.callback_ = undefined;
      this.target_ = undefined;
      this.observable_ = undefined;
      this.value_ = undefined;
      this.getValueFn_ = undefined;
      this.setValueFn_ = undefined;
    }
  };

  var expectedRecordTypes = {
    add: true,
    update: true,
    delete: true
  };

  function diffObjectFromChangeRecords(object, changeRecords, oldValues) {
    var added = {};
    var removed = {};

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      if (!expectedRecordTypes[record.type]) {
        console.error('Unknown changeRecord type: ' + record.type);
        console.error(record);
        continue;
      }

      if (!(record.name in oldValues))
        oldValues[record.name] = record.oldValue;

      if (record.type == 'update')
        continue;

      if (record.type == 'add') {
        if (record.name in removed)
          delete removed[record.name];
        else
          added[record.name] = true;

        continue;
      }

      // type = 'delete'
      if (record.name in added) {
        delete added[record.name];
        delete oldValues[record.name];
      } else {
        removed[record.name] = true;
      }
    }

    var prop;
    for (prop in added)
      added[prop] = object[prop];

    for (prop in removed)
      removed[prop] = undefined;

    var changed = {};
    for (prop in oldValues) {
      if (prop in added || prop in removed)
        continue;

      var newValue = object[prop];
      if (oldValues[prop] !== newValue)
        changed[prop] = newValue;
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {

    // Note: This function is *based* on the computation of the Levenshtein
    // "edit" distance. The one change is that "updates" are treated as two
    // edits - not one. With Array splices, an update is really a delete
    // followed by an add. By retaining this, we optimize for "keeping" the
    // maximum array items in the original array. For example:
    //
    //   'xxxx123' -> '123yyyy'
    //
    // With 1-edit updates, the shortest path would be just to update all seven
    // characters. With 2-edit updates, we delete 4, leave 3, and add 4. This
    // leaves the substring '123' intact.
    calcEditDistances: function(current, currentStart, currentEnd,
                                old, oldStart, oldEnd) {
      // "Deletion" columns
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);

      var i, j;

      // "Addition" rows. Initialize null column.
      for (i = 0; i < rowCount; i++) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      // Initialize null row
      for (j = 0; j < columnCount; j++)
        distances[0][j] = j;

      for (i = 1; i < rowCount; i++) {
        for (j = 1; j < columnCount; j++) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
            distances[i][j] = distances[i - 1][j - 1];
          else {
            var north = distances[i - 1][j] + 1;
            var west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },

    // This starts at the final weight, and walks "backward" by finding
    // the minimum previous weight recursively until the origin of the weight
    // matrix.
    spliceOperationsFromEditDistances: function(distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i == 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j == 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];

        var min;
        if (west < north)
          min = west < northWest ? west : northWest;
        else
          min = north < northWest ? north : northWest;

        if (min == northWest) {
          if (northWest == current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min == west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },

    /**
     * Splice Projection functions:
     *
     * A splice map is a representation of how a previous array of items
     * was transformed into a new array of items. Conceptually it is a list of
     * tuples of
     *
     *   <index, removed, addedCount>
     *
     * which are kept in ascending index order of. The tuple represents that at
     * the |index|, |removed| sequence of items were removed, and counting forward
     * from |index|, |addedCount| items were added.
     */

    /**
     * Lacking individual splice mutation information, the minimal set of
     * splices can be synthesized given the previous state and final state of an
     * array. The basic approach is to calculate the edit distance matrix and
     * choose the shortest path through it.
     *
     * Complexity: O(l * p)
     *   l: The length of the current array
     *   p: The length of the old array
     */
    calcSplices: function(current, currentStart, currentEnd,
                          old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;

      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart == 0 && oldStart == 0)
        prefixCount = this.sharedPrefix(current, old, minLength);

      if (currentEnd == current.length && oldEnd == old.length)
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
        return [];

      var splice;
      if (currentStart == currentEnd) {
        splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd)
          splice.removed.push(old[oldStart++]);

        return [ splice ];
      } else if (oldStart == oldEnd)
        return [ newSplice(currentStart, [], currentEnd - currentStart) ];

      var ops = this.spliceOperationsFromEditDistances(
          this.calcEditDistances(current, currentStart, currentEnd,
                                 old, oldStart, oldEnd));

      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; i++) {
        switch(ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }
      return splices;
    },

    sharedPrefix: function(current, old, searchLength) {
      for (var i = 0; i < searchLength; i++)
        if (!this.equals(current[i], old[i]))
          return i;
      return searchLength;
    },

    sharedSuffix: function(current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2]))
        count++;

      return count;
    },

    calculateSplices: function(current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0,
                              previous.length);
    },

    equals: function(currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };

  var arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd,
                       old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd,
                                   old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    // Disjoint
    if (end1 < start2 || end2 < start1)
      return -1;

    // Adjacent
    if (end1 == start2 || end2 == start1)
      return 0;

    // Non-zero intersect, span1 first
    if (start1 < start2) {
      if (end1 < end2)
        return end1 - start2; // Overlap
      else
        return end2 - start2; // Contained
    } else {
      // Non-zero intersect, span2 first
      if (end2 < end1)
        return end2 - start1; // Overlap
      else
        return end1 - start1; // Contained
    }
  }

  function mergeSplice(splices, index, removed, addedCount) {

    var splice = newSplice(index, removed, addedCount);

    var inserted = false;
    var insertionOffset = 0;

    for (var i = 0; i < splices.length; i++) {
      var current = splices[i];
      current.index += insertionOffset;

      if (inserted)
        continue;

      var intersectCount = intersect(splice.index,
                                     splice.index + splice.removed.length,
                                     current.index,
                                     current.index + current.addedCount);

      if (intersectCount >= 0) {
        // Merge the two splices

        splices.splice(i, 1);
        i--;

        insertionOffset -= current.addedCount - current.removed.length;

        splice.addedCount += current.addedCount - intersectCount;
        var deleteCount = splice.removed.length +
                          current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          // merged splice is a noop. discard.
          inserted = true;
        } else {
          removed = current.removed;

          if (splice.index < current.index) {
            // some prefix of splice.removed is prepended to current.removed.
            var prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, removed);
            removed = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            // some suffix of splice.removed is appended to current.removed.
            var append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(removed, append);
          }

          splice.removed = removed;
          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {
        // Insert splice here.

        inserted = true;

        splices.splice(i, 0, splice);
        i++;

        var offset = splice.addedCount - splice.removed.length;
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted)
      splices.push(splice);
  }

  function createInitialSplices(array, changeRecords) {
    var splices = [];

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      switch(record.type) {
        case 'splice':
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;
        case 'add':
        case 'update':
        case 'delete':
          if (!isIndex(record.name))
            continue;
          var index = toNumber(record.name);
          if (index < 0)
            continue;
          mergeSplice(splices, index, [record.oldValue], 1);
          break;
        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    var splices = [];

    createInitialSplices(array, changeRecords).forEach(function(splice) {
      if (splice.addedCount == 1 && splice.removed.length == 1) {
        if (splice.removed[0] !== array[splice.index])
          splices.push(splice);

        return;
      }

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount,
                                           splice.removed, 0, splice.removed.length));
    });

    return splices;
  }

  // Export the observe-js object for **Node.js**, with backwards-compatibility
  // for the old `require()` API. Also ensure `exports` is not a DOM Element.
  // If we're in the browser, export as a global object.

  var expose = global;

  if (typeof exports !== 'undefined' && !exports.nodeType) {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports;
    }
    expose = exports;
  }

  expose.Observer = Observer;
  expose.Observer.runEOM_ = runEOM;
  expose.Observer.observerSentinel_ = observerSentinel; // for testing.
  expose.Observer.hasObjectObserve = hasObserve;
  expose.ArrayObserver = ArrayObserver;
  expose.ArrayObserver.calculateSplices = function(current, previous) {
    return arraySplice.calculateSplices(current, previous);
  };

  expose.ArraySplice = ArraySplice;
  expose.ObjectObserver = ObjectObserver;
  expose.PathObserver = PathObserver;
  expose.CompoundObserver = CompoundObserver;
  expose.Path = Path;
  expose.ObserverTransform = ObserverTransform;

})(typeof global !== 'undefined' && global && typeof module !== 'undefined' && module ? global : this || window);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(_dereq_,module,exports){

},{}]},{},[1])(1)
});
Polymer.XPTabBehaviorImp = {

        /**
         * Fired when the tab is closing.
         *
         * @event xp-tab-close
         * @param {Element} firer
         * @param {boolean} isActive
         * @param {boolean} isModified
         * @bubbles
         */

        /*********************************************************************/

        /**
         * Compares the tab's data with its memento.
         *
         * @method compare
         * @returns {Element}
         */
        compare: function () {
            var self = this;
            self._setModified(!!self.dataObserver && !!self.mementoObserver && !XP.isEquivalent(self.data, self.memento));
            return self;
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * If set to true, the tab can be closed.
             *
             * @attribute closable
             * @type boolean
             * @default false
             * @notifies
             */
            closable: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The `tagName` of the element to inject into the tab's target.
             *
             * @attribute content
             * @type string
             * @notifies
             */
            content: {
                notify: true,
                observer: '_contentObserver',
                reflectToAttribute: true,
                type: String
            },

            /**
             * The tab's data.
             *
             * @attribute data
             * @type *
             */
            data: {
                observer: '_dataObserver'
            },

            /**
             * The tab's label.
             *
             * @attribute label
             * @type string
             */
            label: {
                reflectToAttribute: true,
                type: String
            },

            /**
             * The tab's memento, used to know when the tab's data changes.
             *
             * @attribute memento
             * @type *
             * @notifies
             */
            memento: {
                notify: true,
                observer: '_mementoObserver'
            },

            /**
             * If set to true, the tab's data and its memento are not equivalent.
             *
             * @attribute modified
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            modified: {
                notify: true,
                readOnly: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The master selector.
             *
             * @attribute selector
             * @type Element
             * @notifies
             * @readonly
             */
            selector: {
                notify: true,
                readOnly: true
            }
        },

        /*********************************************************************/

        // OBSERVER
        _contentObserver: function () {

            // Vars
            var self   = this,
                target = self.findTarget();

            // Setting
            if (target) { target.content = self.content; }
        },

        // OBSERVER
        _dataObserver: function (post, pre) {

            // Vars
            var self   = this,
                target = self.findTarget();

            // Setting
            if (target && target.data === pre) { target.data = self.data; }

            // Disconnecting
            if (self.dataObserver) { self.dataObserver.disconnect(); }

            // Observing
            self.dataObserver = XP.isObject(self.data) ? new XPObserver(self.data, self.compare.bind(self), true) : null;

            // Comparing
            self.compare();
        },

        // OBSERVER
        _mementoObserver: function () {

            // Vars
            var self = this;

            // Disconnecting
            if (self.mementoObserver) { self.mementoObserver.disconnect(); }

            // Observing
            self.mementoObserver = XP.isObject(self.memento) ? new XPObserver(self.memento, self.compare.bind(self), true) : null;

            // Comparing
            self.compare();
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('tab');
        },

        // LISTENER
        ready: function () {

            // Mapping
            this.mastersMap.selector = '.tabs';
        },

        /*********************************************************************/

        // HANDLER
        _closeHandler: function (event) {

            // Vars
            var self = this;

            // Stopping
            event.stopPropagation();

            // Firing
            if (!event.detail.target) { self.fire('xp-tab-close', {firer: self, isActive: self.active, isModified: self.modified}); }
        }
    };

    Polymer.XPTabBehavior = [
        Polymer.XPSlaveBehavior,
        Polymer.XPTargeterBehavior,
        Polymer.XPTabBehaviorImp
    ];
(function () {

        // Vars
        var commands = {};

        // Prototype
        Polymer.XPCommandsBehaviorImp = {

            /**
             * Adds a widget or application command.
             *
             * The `name` should be expressed in the form "namespace:action".
             *
             * @method addCommand
             * @param {string} name
             * @param {Object} [options]
             *   @param {string} [options.filter]
             *   @param {string} [options.selector]
             * @returns {Element}
             */
            addCommand: function (name, options) {

                // Asserting
                XP.assertArgument(XP.isString(name, true), 1, 'string');
                XP.assertArgument(XP.isVoid(options) || XP.isObject(options), 2, 'Object');
                XP.assertOption(!options || XP.isVoid(options.filter) || XP.isString(options.filter, true), 'options.filter', 'string');
                XP.assertOption(!options || XP.isVoid(options.selector) || XP.isString(options.selector, true), 'options.selector', 'string');

                // Vars
                var self = this;

                // Preparing
                options = options || {};

                // Setting
                self.set('commands.' + name, {
                    filter: options.filter || '',
                    selector: options.selector || '',
                    targets: options.selector ? XP.filterElements(self.commanders, options.selector) : [self]
                });

                // Notifying
                self.notifyOthers('commanders', 'commands.' + name, self.commands[name]);

                return self;
            },

            /**
             * Adds a map of commands.
             *
             * @method addCommands
             * @param {Array | Object} commands
             * @returns {Element}
             */
            addCommands: function (commands) {

                // Asserting
                XP.assertArgument(XP.isCollection(commands), 1, 'Array or Object');

                // Vars
                var self        = this,
                    arrIterator = function (commands) { XP.forEach(commands, function (name) { self.addCommand(name); }); return self; },
                    objIterator = function (commands) { XP.forOwn(commands, function (options, name) { self.addCommand(name, options); }); return self; };

                // Adding
                return (XP.isArrayable(commands) ? arrIterator : objIterator)(commands);
            },

            /**
             * Executes a widget or application command.
             *
             * @param {string} name
             * @param {Array} [args]
             * @returns {Element}
             */
            doCommand: function (name, args) {

                // Asserting
                XP.assertArgument(XP.isString(name, true), 1, 'string');
                XP.assertArgument(XP.isVoid(args) || XP.isArray(args), 2, 'Array');

                // Vars
                var self    = this,
                    command = self.commands[name],
                    parts   = command && XP.split(name, ':'),
                    method  = command && XP.camelCase('do-' + parts[parts.length - 1]),
                    targets = command && command.targets;

                // Invoking
                XP.forEach(targets || [], function (target) {

                    // Checking
                    if (!target.isAttached || (command.filter && !XP.matches(target, command.filter))) { return; }

                    // Applying
                    target[method].apply(target, args);
                });

                return self;
            },

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The map of commands.
                 *
                 * @attribute commands
                 * @type Object
                 * @notifies
                 * @readonly
                 */
                commands: {
                    notify: true,
                    readOnly: true,
                    value: commands
                }
            },

            /**
             * The list of commanders.
             *
             * @property commanders
             * @type Array
             * @default []
             * @readonly
             */
            commanders: [],

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Vars
                var self = this;

                // Iterating
                XP.forOwn(self.commands, function (command, name) {

                    // Vars
                    var path = 'commands.' + name + '.targets';

                    // Pushing
                    if (command.selector && XP.matches(self, command.selector)) { self.append(path, self); } else { return; }

                    // Notifying
                    self.notifyOthers('commanders', path + '.length', self.get(path + '.length'));
                });
            },

            // LISTENER
            detached: function () {

                // Vars
                var self = this;

                // Iterating
                XP.forOwn(self.commands, function (command, name) {

                    // Vars
                    var path = 'commands.' + name + '.targets';

                    // Pushing
                    if (command.selector && XP.matches(self, command.selector)) { self.pull(path, self); } else { return; }

                    // Notifying
                    self.notifyOthers('commanders', path + '.length', self.get(path + '.length'));
                });
            },

            // LISTENER
            ready: function () {

                // Appending
                this.append('commanders', this);
            }
        };

        Polymer.XPCommandsBehavior = [
            Polymer.XPArrayBehavior,
            Polymer.XPRefirerBehavior,
            Polymer.XPCommandsBehaviorImp
        ]
    }());
Polymer.XPI18nBehaviorImp = {

        /**
         * Translates a string, an array or an object using a map, `locale`, and returns the localized values.
         *
         * @method localize
         * @param {Array | Object | string} [string = ""]
         * @param {Object} [locale]
         * @returns {Array | Object | string}
         */
        localize: function (string, locale) {
            return XP.localize(string, locale);
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * The current locale.
             *
             * @attribute locale
             * @type Object
             * @notifies
             * @readonly
             */
            locale: {
                computed: '_computeLocale(shared.*)',
                notify: true,
                type: Object
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeLocale: function () {
            var language = this.shared.language, locale = this.shared.locale;
            return (locale && language && locale[language]) || null;
        }
    };

    Polymer.XPI18nBehavior = [
        Polymer.XPSharedBehavior,
        Polymer.XPI18nBehaviorImp
    ];
Polymer.XPCommonBehaviorImp = {

        // PROPERTIES
        properties: {

            /**
             * The shared schema.
             *
             * @attribute schema
             * @type Object
             * @notifies
             * @readonly
             */
            schema: {
                computed: '_computeSchema(shared.*)',
                notify: true,
                type: Object
            }
        },

        /*********************************************************************/

        // COMPUTER
        _computeProperty: function (value) {
            return value;
        },

        // COMPUTER
        _computeSchema: function () {
            return (this.shared && this.shared.schema) || null;
        }
    };

    Polymer.XPCommonBehavior = [
        Polymer.XPArrayBehavior,
        Polymer.XPCommandsBehavior,
        Polymer.XPI18nBehavior,
        Polymer.XPObjectBehavior,
        Polymer.XPRefirerBehavior,
        Polymer.XPSharedBehavior,
        Polymer.XPCommonBehaviorImp
    ];
Polymer({

        // ELEMENT
        is: 'xp-route',

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * If set to true, the route is currently active.
             *
             * @attribute active
             * @type boolean
             * @default false
             * @notifies
             */
            active: {
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The route's data.
             *
             * @attribute data
             * @type *
             */
            data: {},

            /**
             * The path that must be matched against the URL hash to activate the route.
             *
             * @attribute path
             * @type string
             */
            path: {
                reflectToAttribute: true,
                type: String
            },

            /**
             * The path to be redirected at when the route becomes active.
             *
             * @attribute redirect
             * @type string
             */
            redirect: {
                type: String
            }
        },

        /*********************************************************************/

        // LISTENER
        created: function () {

            // Classifying
            this.classList.add('route');
        }
    });
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XPRouter = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports=_dereq_("./lib");
},{"./lib":2}],2:[function(_dereq_,module,exports){
(function (global){
!function(e){"use strict";var n=_dereq_("path-to-regexp"),t=e.XP||_dereq_("expandjs"),r=t.isBrowser()?_dereq_("director/build/director"):_dereq_("director"),i=t.isBrowser()?r.Router:r.http.Router;module.exports=e.XPRouter=new t.Class("XPRouter",{initialize:function(e){var n=this;n._adaptee=new i,n._server=t.isBrowser()?null:e,n._adaptee.configure({recurse:!1}),n._server&&n._server.on("request",n._handleRequest.bind(n))},on:function(e,r,i){t.isFunction(r)&&(i=r,r="GET"),t.assertArgument(t.isString(e,!0),1,"string"),t.assertArgument(t.isString(r,!0),2,"string"),t.assertArgument(t.isFunction(i),3,"Function");var s=this,u=[];return s.running?s:(u=t.pluck(n(e,u)&&u,"name"),r=t.isBrowser()?"on":r.toLowerCase(),t.isBrowser()?s._adaptee[r](e,function(){i(t.zipObject(u,arguments))}):s._adaptee[r](e,function(){i(t.assign(this.req,{params:t.zipObject(u,arguments)}),this.res)}),s)},run:function(){var e=this;return!e.running&&t.isBrowser()&&t.delay(function(){e._adaptee.init("/")}),e},route:{get:function(){return this.running&&this._adaptee.getRoute()||null}},running:{set:function(e){return this.running||!!e}},_adaptee:{enumerable:!1,set:function(e){return this._adaptee||e},validate:function(e){return!t.isObject(e)&&"Object"}},_server:{enumerable:!1,set:function(e){return t.isDefined(this._server)?this._server:e},validate:function(e){return!t.isBrowser()&&!t.isObject(e)&&"Object"}},_handleRequest:function(e,n){var r=this,i=[];e.on("data",function(e){i.push(e)}),e.on("end",function(){e.body=t.join(i)}),r._adaptee.dispatch(e,n,function(){n.writeHead(404),n.end()})}})}("undefined"!=typeof window?window:global);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"director":6,"director/build/director":3,"expandjs":6,"path-to-regexp":5}],3:[function(_dereq_,module,exports){
!function(t){function e(){return""===c.hash||"#"===c.hash}function r(t,e){for(var r=0;r<t.length;r+=1)if(e(t[r],r,t)===!1)return}function i(t){for(var e=[],r=0,i=t.length;i>r;r++)e=e.concat(t[r]);return e}function n(t,e,r){if(!t.length)return r();var i=0;!function n(){e(t[i],function(e){e||e===!1?(r(e),r=function(){}):(i+=1,i===t.length?r():n())})}()}function o(t,e,r){r=t;for(var i in e)if(e.hasOwnProperty(i)&&(r=e[i](t),r!==t))break;return r===t?"([._a-zA-Z0-9-%()]+)":r}function h(t,e){for(var r,i=0,n="";r=t.substr(i).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/);)i=r.index+r[0].length,r[0]=r[0].replace(/^\*/,"([_.()!\\ %@&a-zA-Z0-9-]+)"),n+=t.substr(0,r.index)+r[0];t=n+=t.substr(i);var s,h,a=t.match(/:([^\/]+)/gi);if(a){h=a.length;for(var c=0;h>c;c++)s=a[c],t="::"===s.slice(0,2)?s.slice(1):t.replace(s,o(s,e))}return t}function a(t,e,r,i){var n,o=0,s=0,h=0,r=(r||"(").toString(),i=(i||")").toString();for(n=0;n<t.length;n++){var a=t[n];if(a.indexOf(r,o)>a.indexOf(i,o)||~a.indexOf(r,o)&&!~a.indexOf(i,o)||!~a.indexOf(r,o)&&~a.indexOf(i,o)){if(s=a.indexOf(r,o),h=a.indexOf(i,o),~s&&!~h||!~s&&~h){var c=t.slice(0,(n||1)+1).join(e);t=[c].concat(t.slice((n||1)+1))}o=(h>s?h:s)+1,n=0}else o=0}return t}var c=document.location,u={mode:"modern",hash:c.hash,history:!1,check:function(){var t=c.hash;t!=this.hash&&(this.hash=t,this.onHashChanged())},fire:function(){"modern"===this.mode?this.history===!0?window.onpopstate():window.onhashchange():this.onHashChanged()},init:function(t,e){function r(t){for(var e=0,r=f.listeners.length;r>e;e++)f.listeners[e](t)}var i=this;if(this.history=e,f.listeners||(f.listeners=[]),"onhashchange"in window&&(void 0===document.documentMode||document.documentMode>7))this.history===!0?setTimeout(function(){window.onpopstate=r},500):window.onhashchange=r,this.mode="modern";else{var n=document.createElement("iframe");n.id="state-frame",n.style.display="none",document.body.appendChild(n),this.writeFrame(""),"onpropertychange"in document&&"attachEvent"in document&&document.attachEvent("onpropertychange",function(){"location"===event.propertyName&&i.check()}),window.setInterval(function(){i.check()},50),this.onHashChanged=r,this.mode="legacy"}return f.listeners.push(t),this.mode},destroy:function(t){if(f&&f.listeners)for(var e=f.listeners,r=e.length-1;r>=0;r--)e[r]===t&&e.splice(r,1)},setHash:function(t){return"legacy"===this.mode&&this.writeFrame(t),this.history===!0?(window.history.pushState({},document.title,t),this.fire()):c.hash="/"===t[0]?t:"/"+t,this},writeFrame:function(t){var e=document.getElementById("state-frame"),r=e.contentDocument||e.contentWindow.document;r.open(),r.write("<script>_hash = '"+t+"'; onload = parent.listener.syncHash;<script>"),r.close()},syncHash:function(){var t=this._hash;return t!=c.hash&&(c.hash=t),this},onHashChanged:function(){}},f=t.Router=function(t){return this instanceof f?(this.params={},this.routes={},this.methods=["on","once","after","before"],this.scope=[],this._methods={},this._insert=this.insert,this.insert=this.insertEx,this.historySupport=null!=(null!=window.history?window.history.pushState:null),this.configure(),void this.mount(t||{})):new f(t)};f.prototype.init=function(t){var r,i=this;return this.handler=function(t){var e=t&&t.newURL||window.location.hash,r=i.history===!0?i.getPath():e.replace(/.*#/,"");i.dispatch("on","/"===r.charAt(0)?r:"/"+r)},u.init(this.handler,this.history),this.history===!1?e()&&t?c.hash=t:e()||i.dispatch("on","/"+c.hash.replace(/^(#\/|#|\/)/,"")):(this.convert_hash_in_init?(r=e()&&t?t:e()?null:c.hash.replace(/^#/,""),r&&window.history.replaceState({},document.title,r)):r=this.getPath(),(r||this.run_in_init===!0)&&this.handler()),this},f.prototype.explode=function(){var t=this.history===!0?this.getPath():c.hash;return"/"===t.charAt(1)&&(t=t.slice(1)),t.slice(1,t.length).split("/")},f.prototype.setRoute=function(t,e,r){var i=this.explode();return"number"==typeof t&&"string"==typeof e?i[t]=e:"string"==typeof r?i.splice(t,e,s):i=[t],u.setHash(i.join("/")),i},f.prototype.insertEx=function(t,e,r,i){return"once"===t&&(t="on",r=function(t){var e=!1;return function(){return e?void 0:(e=!0,t.apply(this,arguments))}}(r)),this._insert(t,e,r,i)},f.prototype.getRoute=function(t){var e=t;if("number"==typeof t)e=this.explode()[t];else if("string"==typeof t){var r=this.explode();e=r.indexOf(t)}else e=this.explode();return e},f.prototype.destroy=function(){return u.destroy(this.handler),this},f.prototype.getPath=function(){var t=window.location.pathname;return"/"!==t.substr(0,1)&&(t="/"+t),t};var l=/\?.*/;f.prototype.configure=function(t){t=t||{};for(var e=0;e<this.methods.length;e++)this._methods[this.methods[e]]=!0;return this.recurse=t.recurse||this.recurse||!1,this.async=t.async||!1,this.delimiter=t.delimiter||"/",this.strict="undefined"==typeof t.strict?!0:t.strict,this.notfound=t.notfound,this.resource=t.resource,this.history=t.html5history&&this.historySupport||!1,this.run_in_init=this.history===!0&&t.run_handler_in_init!==!1,this.convert_hash_in_init=this.history===!0&&t.convert_hash_in_init!==!1,this.every={after:t.after||null,before:t.before||null,on:t.on||null},this},f.prototype.param=function(t,e){":"!==t[0]&&(t=":"+t);var r=new RegExp(t,"g");return this.params[t]=function(t){return t.replace(r,e.source||e)},this},f.prototype.on=f.prototype.route=function(t,e,r){var i=this;return r||"function"!=typeof e||(r=e,e=t,t="on"),Array.isArray(e)?e.forEach(function(e){i.on(t,e,r)}):(e.source&&(e=e.source.replace(/\\\//gi,"/")),Array.isArray(t)?t.forEach(function(t){i.on(t.toLowerCase(),e,r)}):(e=e.split(new RegExp(this.delimiter)),e=a(e,this.delimiter),void this.insert(t,this.scope.concat(e),r)))},f.prototype.path=function(t,e){var r=this.scope.length;t.source&&(t=t.source.replace(/\\\//gi,"/")),t=t.split(new RegExp(this.delimiter)),t=a(t,this.delimiter),this.scope=this.scope.concat(t),e.call(this,this),this.scope.splice(r,t.length)},f.prototype.dispatch=function(t,e,r){function i(){o.last=s.after,o.invoke(o.runlist(s),o,r)}var n,o=this,s=this.traverse(t,e.replace(l,""),this.routes,""),h=this._invoked;return this._invoked=!0,s&&0!==s.length?("forward"===this.recurse&&(s=s.reverse()),n=this.every&&this.every.after?[this.every.after].concat(this.last):[this.last],n&&n.length>0&&h?(this.async?this.invoke(n,this,i):(this.invoke(n,this),i()),!0):(i(),!0)):(this.last=[],"function"==typeof this.notfound&&this.invoke([this.notfound],{method:t,path:e},r),!1)},f.prototype.invoke=function(t,e,i){var o,s=this;this.async?(o=function(r,i){return Array.isArray(r)?n(r,o,i):void("function"==typeof r&&r.apply(e,(t.captures||[]).concat(i)))},n(t,o,function(){i&&i.apply(e,arguments)})):(o=function(i){return Array.isArray(i)?r(i,o):"function"==typeof i?i.apply(e,t.captures||[]):void("string"==typeof i&&s.resource&&s.resource[i].apply(e,t.captures||[]))},r(t,o))},f.prototype.traverse=function(t,e,r,i,n){function o(t){function e(t){for(var r=[],i=0;i<t.length;i++)r[i]=Array.isArray(t[i])?e(t[i]):t[i];return r}function r(t){for(var e=t.length-1;e>=0;e--)Array.isArray(t[e])?(r(t[e]),0===t[e].length&&t.splice(e,1)):n(t[e])||t.splice(e,1)}if(!n)return t;var i=e(t);return i.matched=t.matched,i.captures=t.captures,i.after=t.after.filter(n),r(i),i}var s,h,a,c,u=[];if(e===this.delimiter&&r[t])return c=[[r.before,r[t]].filter(Boolean)],c.after=[r.after].filter(Boolean),c.matched=!0,c.captures=[],o(c);for(var f in r)if(r.hasOwnProperty(f)&&(!this._methods[f]||this._methods[f]&&"object"==typeof r[f]&&!Array.isArray(r[f]))){if(s=h=i+this.delimiter+f,this.strict||(h+="["+this.delimiter+"]?"),a=e.match(new RegExp("^"+h)),!a)continue;if(a[0]&&a[0]==e&&r[f][t])return c=[[r[f].before,r[f][t]].filter(Boolean)],c.after=[r[f].after].filter(Boolean),c.matched=!0,c.captures=a.slice(1),this.recurse&&r===this.routes&&(c.push([r.before,r.on].filter(Boolean)),c.after=c.after.concat([r.after].filter(Boolean))),o(c);if(c=this.traverse(t,e,r[f],s),c.matched)return c.length>0&&(u=u.concat(c)),this.recurse&&(u.push([r[f].before,r[f].on].filter(Boolean)),c.after=c.after.concat([r[f].after].filter(Boolean)),r===this.routes&&(u.push([r.before,r.on].filter(Boolean)),c.after=c.after.concat([r.after].filter(Boolean)))),u.matched=!0,u.captures=c.captures,u.after=c.after,o(u)}return!1},f.prototype.insert=function(t,e,r,i){var n,o,s,a,c;if(e=e.filter(function(t){return t&&t.length>0}),i=i||this.routes,c=e.shift(),/\:|\*/.test(c)&&!/\\d|\\w/.test(c)&&(c=h(c,this.params)),e.length>0)return i[c]=i[c]||{},this.insert(t,e,r,i[c]);if(c||e.length||i!==this.routes){if(o=typeof i[c],s=Array.isArray(i[c]),i[c]&&!s&&"object"==o)switch(n=typeof i[c][t]){case"function":return void(i[c][t]=[i[c][t],r]);case"object":return void i[c][t].push(r);case"undefined":return void(i[c][t]=r)}else if("undefined"==o)return a={},a[t]=r,void(i[c]=a);throw new Error("Invalid route context: "+o)}switch(n=typeof i[t]){case"function":return void(i[t]=[i[t],r]);case"object":return void i[t].push(r);case"undefined":return void(i[t]=r)}},f.prototype.extend=function(t){function e(t){i._methods[t]=!0,i[t]=function(){var e=1===arguments.length?[t,""]:[t];i.on.apply(i,e.concat(Array.prototype.slice.call(arguments)))}}var r,i=this,n=t.length;for(r=0;n>r;r++)e(t[r])},f.prototype.runlist=function(t){var e=this.every&&this.every.before?[this.every.before].concat(i(t)):i(t);return this.every&&this.every.on&&e.push(this.every.on),e.captures=t.captures,e.source=t.source,e},f.prototype.mount=function(t,e){function r(e,r){var n=e,o=e.split(i.delimiter),s=typeof t[e],h=""===o[0]||!i._methods[o[0]],c=h?"on":n;return h&&(n=n.slice((n.match(new RegExp("^"+i.delimiter))||[""])[0].length),o.shift()),h&&"object"===s&&!Array.isArray(t[e])?(r=r.concat(o),void i.mount(t[e],r)):(h&&(r=r.concat(n.split(i.delimiter)),r=a(r,i.delimiter)),void i.insert(c,r,t[e]))}if(t&&"object"==typeof t&&!Array.isArray(t)){var i=this;e=e||[],Array.isArray(e)||(e=e.split(i.delimiter));for(var n in t)t.hasOwnProperty(n)&&r(n,e.slice(0))}}}("object"==typeof exports?exports:window);
},{}],4:[function(_dereq_,module,exports){
module.exports=Array.isArray||function(r){return"[object Array]"==Object.prototype.toString.call(r)};
},{}],5:[function(_dereq_,module,exports){
function parse(e){for(var t,r=[],n=0,o=0,p="";null!=(t=PATH_REGEXP.exec(e));){var a=t[0],i=t[1],s=t.index;if(p+=e.slice(o,s),o=s+a.length,i)p+=i[1];else{p&&(r.push(p),p="");var u=t[2],c=t[3],l=t[4],f=t[5],g=t[6],x=t[7],h="+"===g||"*"===g,m="?"===g||"*"===g,y=u||"/",T=l||f||(x?".*":"[^"+y+"]+?");r.push({name:c||n++,prefix:u||"",delimiter:y,optional:m,repeat:h,pattern:escapeGroup(T)})}}return o<e.length&&(p+=e.substr(o)),p&&r.push(p),r}function compile(e){return tokensToFunction(parse(e))}function tokensToFunction(e){for(var t=new Array(e.length),r=0;r<e.length;r++)"object"==typeof e[r]&&(t[r]=new RegExp("^"+e[r].pattern+"$"));return function(r){for(var n="",o=r||{},p=0;p<e.length;p++){var a=e[p];if("string"!=typeof a){var i,s=o[a.name];if(null==s){if(a.optional)continue;throw new TypeError('Expected "'+a.name+'" to be defined')}if(isarray(s)){if(!a.repeat)throw new TypeError('Expected "'+a.name+'" to not repeat, but received "'+s+'"');if(0===s.length){if(a.optional)continue;throw new TypeError('Expected "'+a.name+'" to not be empty')}for(var u=0;u<s.length;u++){if(i=encodeURIComponent(s[u]),!t[p].test(i))throw new TypeError('Expected all "'+a.name+'" to match "'+a.pattern+'", but received "'+i+'"');n+=(0===u?a.prefix:a.delimiter)+i}}else{if(i=encodeURIComponent(s),!t[p].test(i))throw new TypeError('Expected "'+a.name+'" to match "'+a.pattern+'", but received "'+i+'"');n+=a.prefix+i}}else n+=a}return n}}function escapeString(e){return e.replace(/([.+*?=^!:${}()[\]|\/])/g,"\\$1")}function escapeGroup(e){return e.replace(/([=!:$\/()])/g,"\\$1")}function attachKeys(e,t){return e.keys=t,e}function flags(e){return e.sensitive?"":"i"}function regexpToRegexp(e,t){var r=e.source.match(/\((?!\?)/g);if(r)for(var n=0;n<r.length;n++)t.push({name:n,prefix:null,delimiter:null,optional:!1,repeat:!1,pattern:null});return attachKeys(e,t)}function arrayToRegexp(e,t,r){for(var n=[],o=0;o<e.length;o++)n.push(pathToRegexp(e[o],t,r).source);var p=new RegExp("(?:"+n.join("|")+")",flags(r));return attachKeys(p,t)}function stringToRegexp(e,t,r){for(var n=parse(e),o=tokensToRegExp(n,r),p=0;p<n.length;p++)"string"!=typeof n[p]&&t.push(n[p]);return attachKeys(o,t)}function tokensToRegExp(e,t){t=t||{};for(var r=t.strict,n=t.end!==!1,o="",p=e[e.length-1],a="string"==typeof p&&/\/$/.test(p),i=0;i<e.length;i++){var s=e[i];if("string"==typeof s)o+=escapeString(s);else{var u=escapeString(s.prefix),c=s.pattern;s.repeat&&(c+="(?:"+u+c+")*"),c=s.optional?u?"(?:"+u+"("+c+"))?":"("+c+")?":u+"("+c+")",o+=c}}return r||(o=(a?o.slice(0,-2):o)+"(?:\\/(?=$))?"),o+=n?"$":r&&a?"":"(?=\\/|$)",new RegExp("^"+o,flags(t))}function pathToRegexp(e,t,r){return t=t||[],isarray(t)?r||(r={}):(r=t,t=[]),e instanceof RegExp?regexpToRegexp(e,t,r):isarray(e)?arrayToRegexp(e,t,r):stringToRegexp(e,t,r)}var isarray=_dereq_("isarray");module.exports=pathToRegexp,module.exports.parse=parse,module.exports.compile=compile,module.exports.tokensToFunction=tokensToFunction,module.exports.tokensToRegExp=tokensToRegExp;var PATH_REGEXP=new RegExp(["(\\\\.)","([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))"].join("|"),"g");
},{"isarray":4}],6:[function(_dereq_,module,exports){

},{}]},{},[1])(1)
});


//# sourceMappingURL=xp-router.min.map
Polymer({

        // ELEMENT
        is: 'xp-script',

        // BEHAVIORS
        behaviors: [
            Polymer.XPSharedBehavior
        ],

        /*********************************************************************/

        /**
         * Fired when the script is loaded.
         *
         * @event xp-script-load
         * @param {Element} firer
         * @param {*} data
         * @param {string} src
         * @bubbles
         */

        /**
         * Fired when the script state changes.
         *
         * @event xp-script-state
         * @param {Element} firer
         * @param {string} state
         * @bubbles
         */

        /*********************************************************************/

        /**
         * Injects the script tag.
         *
         * @method inject
         * @param {boolean} [force = false]
         * @returns {Element}
         */
        inject: function (force) {

            // Checking
            if (this.state === 'pending') { return this; }

            // Vars
            var self     = this,
                callback = self.callback,
                src      = self.src,
                promised = self.promises.hasOwnProperty(src) && !force,
                head     = promised ? null : Polymer.dom(document.head),
                older    = promised ? null : head.querySelector('script[src="' + src + '"]'),
                script   = promised ? null : document.createElement('script'),
                promise  = promised ? self.promises[src] : new Promise(function (resolve) { (callback ? window : script)[callback || 'onload'] = resolve; });

            // Resolving
            self.promises[src] = promise.then(function (data) {

                // Checking
                if (callback) { delete window[callback]; }

                // Setting
                self._setState('loaded');
                self._setData(data);

                // Sharing
                if (callback) { self.share(callback, data); }

                // Firing
                self.fire('xp-script-load', {firer: self, data: data, src: src});

                return data;
            });

            // Checking
            if (promised) { return self; }

            // Removing
            if (older) { head.removeChild(older); }

            // Setting
            script.async = true;
            script.src   = src;

            // Appending
            head.appendChild(script);

            // Setting
            if (self.state !== 'loaded') { self._setState('pending'); }

            return self;
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * The name of the callback to be executed in a JSONP request.
             *
             * @attribute callback
             * @type string
             */
            callback: {
                type: String
            },

            /**
             * The received data.
             *
             * @attribute data
             * @type *
             * @notifies
             * @readonly
             */
            data: {
                notify: true,
                readOnly: true
            },

            /**
             * If set to true, the script is loaded.
             *
             * @attribute loaded
             * @type boolean
             * @default false
             * @notifies
             * @readonly
             */
            loaded: {
                computed: '_computeLoaded(state)',
                notify: true,
                reflectToAttribute: true,
                type: Boolean,
                value: false
            },

            /**
             * The script's src.
             *
             * @attribute src
             * @type string
             */
            src: {
                observer: '_srcChanged',
                type: String
            },

            /**
             * The script's state.
             *
             * @attribute state
             * @type string
             * @default "idle"
             * @notifies
             * @readonly
             */
            state: {
                notify: true,
                observer: '_stateChanged',
                readOnly: true,
                reflectToAttribute: true,
                type: String,
                value: 'idle'
            }
        },

        /**
         * The map of promises.
         *
         * @property promises
         * @type Object
         * @default {}
         * @readonly
         */
        promises: {},

        /*********************************************************************/

        // COMPUTER
        _computeLoaded: function (state) {
            return state === 'loaded';
        },

        /*********************************************************************/

        // OBSERVER
        _srcChanged: function () {

            // Injecting
            if (this.src) { this.inject(); }
        },

        // OBSERVER
        _stateChanged: function () {

            // Firing
            this.fire('xp-script-state', {firer: this, state: this.state});
        },

        /*********************************************************************/

        // LISTENING
        created: function () {

            // Classifying
            this.classList.add('script');
        }
    });
Polymer({

        // ELEMENT
        is: 'xp-window',

        // BEHAVIORS
        behaviors: [
            Polymer.XPArrayBehavior
        ],

        /*********************************************************************/

        /**
         * Fired when the window's hash changes.
         *
         * @event xp-window-hashchange
         * @param {Element} firer
         * @bubbles
         */

        /**
         * Fired when the browser has lost access to the network.
         *
         * @event xp-window-offline
         * @param {Element} firer
         * @bubbles
         */

        /**
         * Fired when the browser has gained access to the network.
         *
         * @event xp-window-online
         * @param {Element} firer
         * @bubbles
         */

        /**
         * Fired when a user navigates away from a webpage.
         *
         * @event xp-window-pagehide
         * @param {Element} firer
         * @bubbles
         */

        /**
         * Fired when a user navigates towards a webpage.
         *
         * @event xp-window-pageshow
         * @param {Element} firer
         * @bubbles
         */

        /**
         * Fired when the active history entry changes.
         *
         * @event xp-window-popstate
         * @param {Element} firer
         * @bubbles
         */

        /**
         * Fired when the web window is unloading its content and resources.
         *
         * @event xp-window-unload
         * @param {Element} firer
         * @bubbles
         */

        /*********************************************************************/

        /**
         * Wraps `history.back`.
         *
         * @method back
         * @returns {Element}
         */
        back: function () {
            return history.back() || this;
        },

        /**
         * Wraps `history.forward`.
         *
         * @method forward
         * @returns {Element}
         */
        forward: function () {
            return history.forward() || this;
        },

        /**
         * Wraps `history.go`.
         *
         * @method go
         * @param {number} delta
         * @returns {Element}
         */
        go: function (delta) {
            XP.assertArgument(XP.isInt(delta), 1, 'number');
            return history.go(delta) || this;
        },

        /**
         * Wraps `history.pushState`.
         *
         * @method pushState
         * @param {Object} [data]
         * @param {string} [title = document.title]
         * @param {string} [href = location.href]
         * @returns {Element}
         */
        pushState: function (data, title, href) {

            // Preparing
            if (XP.isString(data)) { href = title; title = data; data = null; }

            // Asserting
            XP.assertArgument(XP.isVoid(data) || XP.isObject(data), 1, 'Object');
            XP.assertArgument(XP.isVoid(data) || XP.isString(title), 2, 'string');
            XP.assertArgument(XP.isVoid(href) || XP.isString(href), 3, 'string');

            // Vars
            var self     = this,
                oldHref  = location.href,
                oldTitle = document.title;

            // Preparing
            href  = href || oldHref;
            title = title || oldTitle;

            // Pushing
            history[href !== oldHref ? 'pushState' : 'replaceState'](XP.assign({}, data, {title: title}), title, href);

            // Setting
            if (title !== oldTitle) { document.title = title; }

            // Firing
            if (href !== oldHref) { XP.delay(self.fire.bind(self, 'xp-window-popstate', {firer: self})); }

            // Refreshing
            XP.invoke(self.instances, 'update');

            return self;
        },

        /**
         * Wraps `history.replaceState`.
         *
         * @method replaceState
         * @param {Object} [data]
         * @param {string} [title = document.title]
         * @returns {Element}
         */
        replaceState: function (data, title) {
            return this.pushState(data, title);
        },

        /**
         * Updates the element.
         *
         * @method update
         * @returns {Element}
         */
        update: function () {

            // Vars
            var self = this;

            // Setting
            self.hash = location.hash;
            self._setHost(location.host);
            self._setHostname(location.hostname);
            self._setHref(location.href);
            self._setOrigin(location.origin);
            self._setPathname(location.pathname);
            self._setProtocol(location.protocol);
            self._setSearch(location.search);
            self._setState(history.state);

            return self;
        },

        /*********************************************************************/

        // PROPERTIES
        properties: {

            /**
             * This attribute is bound to `location.hash`.
             *
             * @attribute hash
             * @type string
             * @default location.hash
             * @notifies
             */
            hash: {
                notify: true,
                observer: '_hashChanged',
                type: String,
                value: location.hash
            },

            /**
             * This attribute is bound to `location.host`.
             *
             * @attribute host
             * @type string
             * @default location.host
             * @notifies
             * @readonly
             */
            host: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.host
            },

            /**
             * This attribute is bound to `location.hostname`.
             *
             * @attribute hostname
             * @type string
             * @default location.hostname
             * @notifies
             * @readonly
             */
            hostname: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.hostname
            },

            /**
             * This attribute is bound to `location.href`.
             *
             * @attribute href
             * @type string
             * @default location.href
             * @notifies
             * @readonly
             */
            href: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.href
            },

            /**
             * This attribute is bound to `location.origin`.
             *
             * @attribute origin
             * @type string
             * @default location.origin
             * @notifies
             * @readonly
             */
            origin: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.origin
            },

            /**
             * This attribute is bound to `location.pathname`.
             *
             * @attribute pathname
             * @type string
             * @default location.pathname
             * @notifies
             * @readonly
             */
            pathname: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.pathname
            },

            /**
             * This attribute is bound to `location.protocol`.
             *
             * @attribute protocol
             * @type string
             * @default location.protocol
             * @notifies
             * @readonly
             */
            protocol: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.protocol
            },

            /**
             * This attribute is bound to `location.search`.
             *
             * @attribute search
             * @type string
             * @default location.search
             * @notifies
             * @readonly
             */
            search: {
                notify: true,
                readOnly: true,
                type: String,
                value: location.search
            },

            /**
             * This attribute is bound to `history.state`.
             *
             * @attribute state
             * @type Object
             * @default history.state
             * @notifies
             * @readonly
             */
            state: {
                notify: true,
                readOnly: true,
                type: Object,
                value: history.state
            }
        },

        /**
         * The list of events.
         *
         * @attribute events
         * @type Array
         * @default ["hashchange", "offline", "online", "pagehide", "pageshow", "popstate", "unload"]
         * @readonly
         */
        events: ['hashchange', 'offline', 'online', 'pagehide', 'pageshow', 'popstate', 'unload'],

        /**
         * The list of instances.
         *
         * @property instances
         * @type Array
         * @default []
         * @readonly
         */
        instances: [],

        /*********************************************************************/

        // OBSERVER
        _hashChanged: function () {

            // Setting
            if (this.hash !== location.hash) { location.hash = this.hash; }
        },

        /*********************************************************************/

        // LISTENER
        ready: function () {

            // Vars
            var self = this;

            // Appending
            self.append('instances', self);

            // Listening
            self.events.forEach(function (event) { self.listen(window, event, '_handleEvent'); });

            // Replacing
            if (!history.state) { self.replaceState({}, document.title); }

            // Setting
            self._setState(history.state);
        },

        /*********************************************************************/

        // HANDLER
        _handleEvent: function (event) {

            // Vars
            var self  = this,
                title = (event.state && event.state.title) || document.title;

            // Setting
            if (event.type === 'popstate' && title !== document.title) { document.title = title; }

            // Updating
            if (event.type === 'hashchange' || event.type === 'popstate') { self.update(); }

            // Firing
            self.fire('xp-window-' + event.type, {firer: self});
        }
    });
/**
   * The `<platinum-sw-cache>` element makes it easy to precache specific resources, perform runtime
   * caching, and serve your cached resources when a network is unavailable.
   * Under the hood, the [sw-toolbox](https://github.com/googlechrome/sw-toolbox) library is used
   * for all the caching and request handling logic.
   * `<platinum-sw-cache>` needs to be a child element of `<platinum-sw-register>`.
   * A simple, yet useful configuration is
   *
   *     <platinum-sw-register auto-register>
   *       <platinum-sw-cache></platinum-sw-cache>
   *     </platinum-sw-register>
   *
   * This is enough to have all of the resources your site uses cached at runtime, both local and
   * cross-origin.
   * (It uses the default `defaultCacheStrategy` of "networkFirst".)
   * When there's a network available, visits to your site will go against the network copy of the
   * resources, but if someone visits your site when they're offline, all the cached resources will
   * be used.
   *
   * @demo demo/index.html An offline-capable eReader demo.
   */
  Polymer({
    is: 'platinum-sw-cache',

    properties: {
      /**
       * Used to configure `<platinum-sw-precache>` behavior via a JSON file instead of via
       * attributes. This can come in handy when the configuration (e.g. which files to precache)
       * depends on the results of a build script.
       *
       * If configuration for the same properties are provided in both the JSON file and via the
       * element's attributes, then in general the JSON file's values take precedence. The one
       * exception is the `precache` property. Any values in the element's `precache` attribute will
       * be concatenated with the values in the JSON file's `precache` property and the set of files
       * that are precached will be the union of the two.
       *
       * There's one additional option, `precacheFingerprint`, that can be set in the JSON. If using
       * a build script that might output a large number of files to precache, its recommended
       * that your build script generate a unique "fingerprint" of the files. Any changes to the
       * `precacheFingerprint` value will result in the underlying service worker kicking off the
       * process of caching the files listed in `precache`.
       * While there are a few different strategies for generating an appropriate
       * `precacheFingerprint` value, a process that makes sense is to use a stable hash of the
       * serialized `precache` array. That way, any changes to the list of files in `precache`
       * will result in a new `precacheFingerprint` value.
       * If your build script is Node.js based, one way to generate this hash is:
       *
       *     var md5 = require('crypto').createHash('md5');
       *     md5.update(JSON.stringify(precache));
       *     var precacheFingerprint = md5.digest('hex');
       *
       * Alternatively, you could use something like the
       * [SHA-1 signature](http://stackoverflow.com/questions/1161869/how-to-get-sha-of-the-latest-commit-from-remote-git-repository)
       * of your latest `git` commit for the `precacheFingerprint` value.
       *
       * An example file may look like:
       *
       *     {
       *       "cacheId": "my-cache-id",
       *       "defaultCacheStrategy": "fastest",
       *       "disabled": false,
       *       "precache": ["file1.html", "file2.css"],
       *       "precacheFingerprint": "FINGERPRINT_OF_FILES_IN_PRECACHE"
       *     }
       */
      cacheConfigFile: String,

      /**
       * An id used to construct the name for the
       * [Cache](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#cache)
       * in which all the resources will be stored.
       *
       * If nothing is provided, the default value set in
       * [`toolbox.options.cacheName`](https://github.com/GoogleChrome/sw-toolbox/blob/8763dcc9fbc9352d58f184050e2131c42f7b6d68/lib/options.js#L28)
       * will be used.
       *
       * The `cacheId` is combined with the service worker's scope to construct the cache name, so
       * two `<platinum-sw-cache>` elements that are associated with different scopes will use
       * different caches.
       */
      cacheId: String,

      /**
       * The caching strategy used for all requests, both for local and cross-origin resources.
       *
       * For a list of strategies, see the [`sw-toolbox` documentation](https://github.com/GoogleChrome/sw-toolbox#built-in-handlers).
       * Specify a strategy as a string, without the "toolbox" prefix. E.g., for
       * `toolbox.networkFirst`, set `defaultCacheStrategy` to "networkFirst".
       *
       * Note that the "cacheFirst" and "cacheOnly" strategies are not recommended, and may be
       * explicitly prevented in a future release. More information can be found at
       * https://github.com/PolymerElements/platinum-sw#cacheonly--cachefirst-defaultcachestrategy-considered-harmful
       *
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#built-in-handlers}
       */
      defaultCacheStrategy: {
        type: String,
        value: 'networkFirst'
      },

      /**
       * If set to true, this element will not set up service worker caching. This is useful to
       * conditionally enable or disable caching depending on the build environment.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Used to provide a list of URLs that are always precached as soon as the service worker is
       * installed. Corresponds to  [`sw-toolbox`'s `precache()` method](https://github.com/GoogleChrome/sw-toolbox#toolboxprecachearrayofurls).
       *
       * This is useful for URLs that that wouldn't necessarily be picked up by runtime caching,
       * i.e. a list of resources that are needed by one of the subpages of your site, or a list of
       * resources that are only loaded via user interaction.
       *
       * `precache` can be used in conjunction with `cacheConfigFile`, and the two arrays will be
       * concatenated.
       *
       * @see {@link https://github.com/GoogleChrome/sw-toolbox#toolboxprecachearrayofurls}
       */
      precache: {
        type: Array,
        value: function() { return []; }
      }
    },

    _getParameters: function(baseURI) {
      return new Promise(function(resolve) {
        var params = {
          importscriptLate: new URL('bootstrap/sw-toolbox-setup.js', baseURI).href,
          defaultCacheStrategy: this.defaultCacheStrategy,
          precache: this.precache
        };

        if (this.cacheConfigFile) {
          params.cacheConfigFile = this.cacheConfigFile;
          window.fetch(this.cacheConfigFile).then(function(response) {
            if (!response.ok) {
              throw Error('unable to load ' + this.cacheConfigFile);
            }
            return response.json();
          }.bind(this)).then(function(config) {
            this.disabled = config.disabled;
            if (this.disabled) {
              // Use an empty set of parameters to effectively disable caching.
              params = {};
            } else {
              // If there's a hash of the list of files to precache provided in the config file,
              // then copy that over to the params that will be used to construct the service worker
              // URL. This works around the issue where a potentially large number of precache
              // files could result in a longer URL than a browser will allow.
              // The actual list of files to precache (in config.precache) will be dealt by the
              // service worker during the install phase, so we can ignore it here.
              // See https://github.com/PolymerElements/platinum-sw/issues/53
              if (config.precacheFingerprint) {
                params.precacheFingerprint = config.precacheFingerprint;
              } else {
                params.precache = params.precache.concat(config.precache);
              }
              params.cacheId = config.cacheId || params.cacheId;
              params.defaultCacheStrategy = config.defaultCacheStrategy ||
                params.defaultCacheStrategy;
            }
          }.bind(this)).catch(function(error) {
            console.info('Skipping precaching: ' + error.message);
          }).then(function() {
            resolve(params);
          });
        } else {
          resolve(params);
        }
      }.bind(this));
    }
  });
/**
   * The `<platinum-sw-register>` element handles
   * [service worker](http://www.html5rocks.com/en/tutorials/service-worker/introduction/)
   * registration, reflects the overall service worker state, and coordinates the configuration
   * provided by other Service Worker Elements.
   * `<platinum-sw-register>` is used as a parent element for child elements in the
   * `<platinum-sw-*>` group.
   *
   *     <platinum-sw-register skip-waiting
   *                           clients-claim
   *                           auto-register
   *                           state="{{state}}"
   *                           on-service-worker-error="handleSWError"
   *                           on-service-worker-updated="handleSWUpdated"
   *                           on-service-worker-installed="handleSWInstalled">
   *       ...one or more <platinum-sw-*> children which share the service worker registration...
   *     </platinum-sw-register>
   *
   * Please see https://github.com/PolymerElements/platinum-sw#top-level-sw-importjs for a
   * *crucial* prerequisite file you must create before `<platinum-sw-register>` can be used!
   *
   * @demo demo/index.html An offline-capable eReader demo.
   */
  Polymer({
    is: 'platinum-sw-register',

    // Used as an "emergency" switch if we make breaking changes in the way <platinum-sw-register>
    // talks to service-worker.js. Otherwise, it shouldn't need to change, and isn't meant to be
    // kept in sync with the element's release number.
    _version: '1.0',

    /**
     * Fired when the initial service worker installation completes successfully.
     * The service worker will normally only be installed once, the first time a page with a
     * `<platinum-sw-register>` element is visited in a given browser. If the same page is visited
     * again, the existing service worker will be reused, and there won't be another
     * `service-worker-installed` fired.
     *
     * @event service-worker-installed
     * @param {String} A message indicating that the installation succeeded.
     */

    /**
     * Fired when the service worker update flow completes successfully.
     * If you make changes to your `<platinum-sw-register>` configuration (i.e. by adding in new
     * `<platinum-sw-*>` child elements, or changing their attributes), users who had the old
     * service worker installed will get the update installed when they see the modified elements.
     *
     * @event service-worker-updated
     * @param {String} A message indicating that the update succeeded.
     */

    /**
     * Fired when an error prevents the service worker installation from completing.
     *
     * @event service-worker-error
     * @param {String} A message indicating what went wrong.
     */

    properties: {
      /**
       * Whether this element should automatically register the corresponding service worker as
       * soon as its added to a page.
       *
       * If set to `false`, then the service worker won't be automatically registered, and you
       * must call this element's `register()` method if you want service worker functionality.
       * This is useful if, for example, the service worker needs to be configured using
       * information that isn't immediately available at the time the page loads.
       *
       * If set to `true`, the service worker will be automatically registered without having to
       * call any methods.
       */
      autoRegister: {
        type: Boolean,
        value: false
      },

      /**
       * The URI used as a base when constructing relative paths to service worker helper libraries
       * that need to be loaded.
       *
       * This can normally be kept set to the default, which will use the directory containing this
       * element as the base. However, if you [Vulcanize](https://github.com/polymer/vulcanize) your
       * elements, then the default base might not be appropriate anymore. This will allow you to
       * override it.
       *
       * See https://github.com/PolymerElements/platinum-sw#relative-paths--vulcanization for more
       * information.
       */
      baseUri: {
        type: String,
        // Grab the URI of this file to use as a base when resolving relative paths.
        // Fallback to './' as a default, though current browsers that don't support
        // document.currentScript also don't support service workers.
        value: document.currentScript ? document.currentScript.baseURI : './'
      },

      /**
       * Whether the activated service worker should [take immediate control](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#clients-claim-method)
       * of any pages under its scope.
       *
       * If this is `false`, the service worker won't have any effect until the next time the page
       * is visited/reloaded.
       * If this is `true`, it will take control and start handling events for the current page
       * (and any pages under the same scope open in other tabs/windows) as soon it's active.
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#clients-claim-method}
       */
      clientsClaim: {
        type: Boolean,
        value: false
      },

      /**
       * The service worker script that is [registered](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register).
       * The script *should* be located at the top level of your site, to ensure that it is able
       * to control all the pages on your site.
       *
       * It's *strongly* recommended that you create a top-level file named `sw-import.js`
       * containing only:
       *
       * `importScripts('bower_components/platinum-sw/service-worker.js');`
       *
       * (adjust to match the path where your `platinum-sw` element directory can be found).
       *
       * This will ensure that your service worker script contains everything needed to play
       * nicely with the Service Worker Elements group.
       *
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register}
       */
      href: {
        type: String,
        value: 'sw-import.js'
      },

      /**
       * Whether the page should be automatically reloaded (via `window.location.reload()`) when
       * the service worker is successfully installed.
       *
       * While it's perfectly valid to continue using a page with a freshly installed service
       * worker, it's a common pattern to want to reload it immediately following the install.
       * This ensures that, for example, if you're using a `<platinum-sw-cache>` with an on the
       * fly caching strategy, it will get a chance to intercept all the requests needed to render
       * your page and store them in the cache.
       *
       * If you don't immediately reload your page, then any resources that were loaded before the
       * service worker was installed (e.g. this `platinum-sw-register.html` file) won't be present
       * in the cache until the next time the page is loaded.
       *
       * Note that this reload will only happen when a service worker is installed for the first
       * time. If the service worker is subsequently updated, it won't trigger another reload.
       */
      reloadOnInstall: {
        type: Boolean,
        value: false
      },

      /**
       * The scope of the service worker, relative to the registered service worker script.
       * All pages that fall under this scope will be controlled by the registered service worker.
       *
       * Normally, this would not need to be changed, unless you want the service worker to only
       * apply to a subset of your site.
       *
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#navigator-service-worker-register}
       */
      scope: {
        type: String,
        value: './'
      },

      /**
       * Whether an updated service worker should [bypass the `waiting` state](https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope-skipwaiting)
       * and immediately become `active`.
       *
       * Normally, during an update, the new service worker stays in the
       * `waiting` state until the current page and any other tabs/windows that are using the old
       * service worker are unloaded.
       *
       * If this is `false`, an updated service worker won't be activated until all instances of
       * the old server worker have been unloaded.
       *
       * If this is `true`, an updated service worker will become `active` immediately.
       * @see {@link https://slightlyoff.github.io/ServiceWorker/spec/service_worker/#service-worker-global-scope-skipwaiting}
       */
      skipWaiting: {
        type: Boolean,
        value: false
      },

      /**
       * The current state of the service worker registered by this element.
       *
       * One of:
       * - 'installed'
       * - 'updated'
       * - 'error'
       * - 'unsupported'
       */
      state: {
        notify: true,
        readOnly: true,
        type: String
      }
    },

    /**
     * Registers the service worker based on the configuration options in this element and any
     * child elements.
     *
     * If you set the `autoRegister` property to `true`, then this method is called automatically
     * at page load.
     * It can be useful to set `autoRegister` to `false` and then explicitly call this method if
     * there are options that are only configured after the page is loaded.
     */
    register: function() {
      if ('serviceWorker' in navigator) {
        this._constructServiceWorkerUrl().then(function(serviceWorkerUrl) {
          this._registerServiceWorker(serviceWorkerUrl);
        }.bind(this));
      } else {
        this._setState('unsupported');
        this.fire('service-worker-error', 'Service workers are not available in the current browser.');
      }
    },

    _constructServiceWorkerUrl: function() {
      var paramsPromises = [];
      var children = Polymer.dom(this).children;
      var baseUri = new URL(this.baseUri, window.location.href);

      for (var i = 0; i < children.length; i++) {
        if (typeof children[i]._getParameters === 'function') {
          paramsPromises.push(children[i]._getParameters(baseUri));
        }
      }

      return Promise.all(paramsPromises).then(function(paramsResolutions) {
        var params = {
          baseURI: baseUri,
          version: this._version
        };

        paramsResolutions.forEach(function(childParams) {
          Object.keys(childParams).forEach(function(key) {
            if (Array.isArray(params[key])) {
              params[key] = params[key].concat(childParams[key]);
            } else {
              params[key] = [].concat(childParams[key]);
            }
          });
        });

        return params;
      }.bind(this)).then(function(params) {
        if (params.importscriptLate) {
          if (params.importscript) {
            params.importscript = params.importscript.concat(params.importscriptLate);
          } else {
            params.importscript = params.importscriptLate;
          }
        }

        if (params.importscript) {
          params.importscript = this._unique(params.importscript);
        }

        // We've already concatenated importscriptLate, so don't include it in the serialized URL.
        delete params.importscriptLate;

        params.clientsClaim = this.clientsClaim;
        params.skipWaiting = this.skipWaiting;

        var serviceWorkerUrl = new URL(this.href, window.location);
        // It's very important to ensure that the serialization is stable.
        // Serializing the same settings should always produce the same URL.
        // Serializing different settings should always produce a different URL.
        // This ensures that the service worker upgrade flow is triggered when settings change.
        serviceWorkerUrl.search = this._serializeUrlParams(params);

        return serviceWorkerUrl;
      }.bind(this));
    },

    _unique: function(arr) {
      return arr.filter(function(item, index) {
        return arr.indexOf(item) === index;
      });
    },

    _serializeUrlParams: function(params) {
      return Object.keys(params).sort().map(function(key) {
        // encodeURIComponent(['a', 'b']) => 'a%2Cb',
        // so this will still work when the values are Arrays.
        // TODO: It won't work if the values in the Arrays have ',' characters in them.
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      }).join('&');
    },

    _registerServiceWorker: function(serviceWorkerUrl) {
      navigator.serviceWorker.register(serviceWorkerUrl, {scope: this.scope}).then(function(registration) {
        if (registration.active) {
          this._setState('installed');
        }

        registration.onupdatefound = function() {
          var installingWorker = registration.installing;
          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  this._setState('updated');
                  this.fire('service-worker-updated',
                    'A new service worker was installed, replacing the old service worker.');
                } else {
                  if (this.reloadOnInstall) {
                    window.location.reload();
                  } else {
                    this._setState('installed');
                    this.fire('service-worker-installed', 'A new service worker was installed.');
                  }
                }
              break;

              case 'redundant':
                this._setState('error');
                this.fire('service-worker-error', 'The installing service worker became redundant.');
              break;
            }
          }.bind(this);
        }.bind(this);
      }.bind(this)).catch(function(error) {
        this._setState('error');
        this.fire('service-worker-error', error.toString());
        if (error.name === 'NetworkError') {
          var location = serviceWorkerUrl.origin + serviceWorkerUrl.pathname;
          console.error('A valid service worker script was not found at ' + location + '\n' +
            'To learn how to fix this, please see\n' +
            'https://github.com/PolymerElements/platinum-sw#top-level-sw-importjs');
        }
      }.bind(this));
    },

    attached: function() {
      if (this.autoRegister) {
        this.async(this.register);
      }
    }
  });
Polymer.AppCommonBehaviorImp = {

    };
    Polymer.AppCommonBehavior = [
        Polymer.XPCommonBehavior,
        Polymer.AppCommonBehaviorImp
    ];
Polymer({

            // ELEMENT
            is: 'mat-icon',

            // BEHAVIORS
            behaviors: [
                Polymer.XPIconBehavior,
                Polymer.MatInkBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The icon's opacity.
                 *
                 * @attribute opacity
                 * @type string
                 * @default "icon"
                 */
                opacity: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'icon'
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-button',

            // BEHAVIORS
            behaviors: [
                Polymer.XPAnchorBehavior,
                Polymer.XPOverlayInjector,
                Polymer.MatPressedInkBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The button's icon.
                 *
                 * @attribute icon
                 * @type string
                 */
                icon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The button's icon's src.
                 *
                 * @attribute icon-src
                 * @type string
                 */
                iconSrc: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The button's label.
                 *
                 * @attribute label
                 * @type string
                 */
                label: {
                    reflectToAttribute: true,
                    type: String
                }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('button');
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-divider',

            // BEHAVIORS
            behaviors: [
                Polymer.MatInkBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * If set to true, the divider is aligned baseline.
                 *
                 * @attribute baseline
                 * @type boolean
                 * @default false
                 */
                baseline: {
                    observer: '_baselineChanged',
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the divider is aligned cap.
                 *
                 * @attribute cap
                 * @type boolean
                 * @default false
                 */
                cap: {
                    observer: '_capChanged',
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The divider's opacity.
                 *
                 * @attribute opacity
                 * @type string
                 * @default "divider"
                 */
                opacity: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'divider'
                }
            },

            /*********************************************************************/

            // OBSERVER
            _baselineChanged: function (post) {
                this.cap = this.cap && !post;
            },

            // OBSERVER
            _capChanged: function (post) {
                this.baseline = this.baseline && !post;
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('divider');
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-dialog',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior,
                Polymer.XPArrayBehavior,
                Polymer.XPDialogBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The list of actions.
                 *
                 * @attribute actions
                 * @type Array
                 * @notifies
                 * @readonly
                 */
                actions: {
                    notify: true,
                    readOnly: true,
                    value: function () { return []; }
                },

                /**
                 * The dialog's background color.
                 *
                 * @attribute background
                 * @type string
                 */
                background: {
                    reflectToAttribute: true,
                    type: Boolean
                },

                /**
                 * The dialog's body.
                 *
                 * @attribute body
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                body: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, there are no actions.
                 *
                 * @attribute empty-actions
                 * @type boolean
                 * @notifies
                 * @readonly
                 */
                emptyActions: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the dialog is full screen.
                 *
                 * @attribute full-screen
                 * @type boolean
                 * @default false
                 */
                fullScreen: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The dialog's height. If `0` the dialog will resize itself based on it's content.
                 *
                 * @attribute height
                 * @type number
                 */
                height: {
                    reflectToAttribute: true,
                    type: Number
                },

                /**
                 * The dialog's label
                 *
                 * @attribute label
                 * @type string
                 */
                label: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, the dialog body is scrollable.
                 *
                 * @attribute scrollable
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                scrollable: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The dialog's width. If `0` the dialog will resize itself based on it's content.
                 *
                 * @attribute width
                 * @type number
                 */
                width: {
                    reflectToAttribute: true,
                    type: Number
                },

                /**
                 * The dialog's z-axis position.
                 *
                 * @attribute z
                 * @type number
                 * @default 24
                 * @notifies
                 */
                z: {
                    notify: true,
                    reflectToAttribute: true,
                    type: Number,
                    value: 24
                }
            },

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Scrolling
                this.scrolling();
            },

            // LISTENER
            mutated: function () {

                // Vars
                var self = this;

                // Finding
                self.overwrite('actions', XP.findElements(Polymer.dom(self), '.action'));

                // Setting
                self._setEmptyActions(!self.actions.length);
            },

            // LISTENER
            ready: function () {

                // Vars
                var self = this;

                // Setting
                self._setBody(Polymer.dom(self.root).querySelector('.body'));

                // Observing
                Polymer.dom(self).observeNodes(self.mutated.bind(self));
            },

            // LISTENER
            scrolling: function () {

                // Vars
                var self = this;

                // Setting
                self._setScrollable(self.body.clientHeight < self.body.scrollHeight);

                // Observing
                XP.onMutation(self, self.scrolling.bind(self), {attributes: true, characterData: true, childList: true, subtree: true});
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-paper',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * If set to true, the material spacing rules are applied.
                 *
                 * @attribute padding
                 * @type boolean
                 * @default false
                 */
                padding: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-drawer',

            // BEHAVIORS
            behaviors: [
                Polymer.XPRefirerBehavior,
                Polymer.XPTargeterBehavior
            ],

            /*********************************************************************/

            /**
             * Fired on hide.
             *
             * @event xp-hide
             * @param {Element} firer
             */

            /**
             * Fired on show.
             * @event xp-show
             * @param {Element} firer
             */

            /*********************************************************************/

            /**
             * Hides the drawer.
             *
             * @method hide
             * @returns {Element}
             */
            hide: function () {
                var self = this;
                if (self.narrow || self.right) { self.showed = false; }
                return self;
            },

            /**
             * Shows the drawer.
             *
             * @method show
             * @returns {Element}
             */
            show: function () {
                var self = this;
                self.showed = true;
                return self;
            },

            /**
             * Toggles the drawer.
             *
             * @method toggle
             * @returns {Element}
             */
            toggle: function () {
                var self = this;
                self[self.showed ? 'hide' : 'show']();
                return self;
            },

            /*********************************************************************/

            // OBSERVERS
            observers: [
                '_breakPointChanged(breakPoint, right)',
                '_offsetChanged(backdrop, column, offset, tracking)',
                '_handleShift(column)',
                '_handleShift(narrow)',
                '_handleShift(showed)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * If set to true, the drawer will not close by selecting something inside.
                 *
                 * @attribute auto-hide-disabled
                 * @type boolean
                 * @default false
                 */
                autoHideDisabled: {
                    type: Boolean,
                    value: false
                },

                /**
                 * The drawer's backdrop.
                 *
                 * @attribute backdrop
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                backdrop: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The drawer's background color.
                 *
                 * @attribute background
                 * @type string
                 */
                background: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The drawer's narrow breakpoint.
                 *
                 * @attribute break-point
                 * @type number
                 * @notifies
                 */
                breakPoint: {
                    notify: true,
                    type: Number
                },

                /**
                 * The drawer's column.
                 *
                 * @attribute column
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                column: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the drawer is hidden.
                 *
                 * @attribute empty
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                empty: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the drawer is an overlay, because the viewport is smaller under its breakpoint.
                 *
                 * @attribute narrow
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                narrow: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The drawer's offset from the screen's edge.
                 *
                 * @attribute offset
                 * @type number
                 * @default 0
                 * @notifies
                 * @readonly
                 */
                offset: {
                    notify: true,
                    readOnly: true,
                    type: Number,
                    value: 0
                },

                /**
                 * If set to true, the material spacing rules are applied.
                 *
                 * @attribute padding
                 * @type boolean
                 * @default false
                 */
                padding: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the drawer is on the right side.
                 *
                 * @attribute right
                 * @type boolean
                 * @default false
                 */
                right: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the drawer is visible.
                 *
                 * @attribute showed
                 * @type boolean
                 * @default false
                 * @notifies
                 */
                showed: {
                    notify: true,
                    observer: '_showedChanged',
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the swipe gesture is disabled.
                 *
                 * @attribute swipe-disabled
                 * @type boolean
                 * @default false
                 */
                swipeDisabled: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The element being tracked.
                 *
                 * @attribute tracked
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                tracked: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The element to listen for tracking.
                 *
                 * @attribute tracker
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                tracker: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the drawer is being tracked.
                 *
                 * @attribute tracking
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                tracking: {
                    computed: '_computeTracking(tracked)',
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The drawer's column's width.
                 *
                 * @attribute width
                 * @type number
                 * @notifies
                 * @readonly
                 */
                width: {
                    notify: true,
                    readOnly: true,
                    type: Number
                }
            },

            /*********************************************************************/

            // COMPUTER
            _computeTracking: function (tracked) {
                return !!tracked;
            },

            // COMPUTER
            _computeZ: function (narrow) {
                return narrow ? 16 : null;
            },

            /*********************************************************************/

            // OBSERVER
            _breakPointChanged: function () {

                // Vars
                var self = this;

                // Setting
                self._setNarrow(window.innerWidth < self.breakPoint);

                // Handling
                if (!self.right && self.showed === self.narrow) { self.async(self._handleShift.bind(self, null, true)); }

                // Showing
                if (!self.right) { self.showed = !self.narrow; }
            },

            // OBSERVER
            _offsetChanged: function () {

                // Vars
                var self      = this,
                    styling   = self.backdrop && self.column,
                    translate = styling && (self.width - self.offset) * (self.right ? 1 : -1);

                // Styling
                if (styling) { self.backdrop.style.opacity = self.tracking ? self.offset / self.width : ''; }
                if (styling) { self.column.style.transform = self.tracking && self.narrow ? 'translateX(' + translate + 'px)' : ''; }
            },

            // OBSERVER
            _showedChanged: function () {

                // Firing
                if (this.isAttached) { this.fire(this.showed ? 'xp-show' : 'xp-hide', {firer: this}); }
            },

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Vars
                var self   = this,
                    parent = Polymer.dom(self).parentNode;

                // Setting
                self._setTracker(XP.isElement(parent) ? parent : self.domHost);

                // Listening
                self.listen(self.tracker, 'track', '_handleTrack');
                self.listen(window, 'keyup', '_handleHide');
                self.listen(window, 'resize', '_handleResize');

                // Handling
                self.async(self._handleShift.bind(self, null, true));
            },

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('drawer');
            },

            // LISTENER
            detached: function () {

                // Vars
                var self = this;

                // Unlistening
                self.unlisten(self.tracker, 'track', '_handleTrack');
                self.unlisten(window, 'keyup', '_handleHide');
                self.unlisten(window, 'resize', '_handleResize');

                // Setting
                self._setTracker(null);
            },

            // LISTENER
            mutated: function () {

                // Setting
                this._setEmpty(!XP.hasChildren(Polymer.dom(this.column)));
            },

            // LISTENER
            ready: function () {

                // Vars
                var self = this;

                // Setting
                self._setBackdrop(Polymer.dom(self.root).querySelector('.backdrop'));
                self._setColumn(Polymer.dom(self.root).querySelector('.column'));
                self.breakPoint = self.breakPoint || (self.right ? 640 : 1280);

                // Observing
                Polymer.dom(self).observeNodes(self.mutated.bind(self));
            },

            /*********************************************************************/

            // HANDLER
            _handleHide: function (event) {

                // Hiding
                if (event.keyCode === 27 || (!event.button && !event.keyCode)) { this.hide(); }
            },

            // HANDLER
            _handleResize: function () {

                // Handling
                this._breakPointChanged();
            },

            // HANDLER
            _handleSelect: function (event) {

                // Vars
                var self = this;

                // Checking
                if (self.autoHideDisabled || self.right || event.detail.multi || !event.detail.isSelected) { return; }

                // Hiding
                if (!self.refire(event).defaultPrevented) { self.hide(); }
            },

            // HANDLER
            _handleShift: function (offset, instant) {

                // Checking
                if (!this.column) { return; }

                // Vars
                var self   = this,
                    other  = self.right ? 'left' : 'right',
                    side   = self.right ? 'right' : 'left',
                    target = self.findTarget() || self.tracker;

                // Setting
                self._setWidth(XP.isNumber(offset) ? self.width : XP.getBoundings(self.column).width);
                self._setOffset(XP.isNumber(offset) ? XP.within(offset, 0, self.width) : (self.showed ? self.width : 0));

                // Checking
                if (!target) { return; }

                // Styling
                target.style.bottom     = 0;
                target.style.top        = 0;
                target.style.position   = 'absolute';
                target.style.transition = !self.tracking && !instant ? side + ' 0.33s cubic-bezier(0.55, 0, 0.01, 1)' : '';
                target.style[side]      = !self.narrow ? self.offset + 'px' : 0;
                target.style[other]     = target.style[other] || 0;
            },

            // HANDLER
            _handleTrack: function (event) {

                // Vars
                var self    = this,
                    state   = event.detail.state,
                    swipe   = event.detail.sourceEvent.type !== 'mousemove' && !self.swipeDisabled,
                    showed  = self.showed,
                    tracked = self.tracked;

                // Tracking
                if (!tracked && swipe && state === 'start') { tracked = Polymer.dom(event).path.indexOf(self) >= 0 ? self : event.currentTarget; }

                // Checking
                if (!tracked || !swipe || (state === 'start' && ((!self.right && !self.narrow) || (tracked !== self && event.detail.x > 48)))) { return; }

                // Switching
                switch (state) {

                // TRACK
                case 'track':
                    self._handleShift(self.offset + event.detail.ddx * (self.right ? -1 : 1));
                    break;

                // START
                case 'start':
                    self._setTracked(tracked);
                    self._setWidth(XP.getBoundings(self.column).width);
                    self._handleShift(self.offset + event.detail.dx * (self.right ? -1 : 1));
                    break;

                // END
                case 'end':
                    self._setTracked(null);
                    self.showed = self.offset > self.width / 2;
                    if (showed === self.showed) { self._handleShift(); }
                    break;
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-drawer-panel',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The application's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "backdrop"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'backdrop'
                },

                /**
                 * The application's left drawer.
                 *
                 * @attribute drawer
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                drawer: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The application's right drawer.
                 *
                 * @attribute right-drawer
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                rightDrawer: {
                    notify: true,
                    readOnly: true
                }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('drawer-panel');
            },

            // LISTENER
            ready: function () {

                // Observing
                Polymer.dom(this).observeNodes(this.mutated.bind(this));
            },

            // LISTENER
            mutated: function () {

                // Vars
                var self = this;

                // Setting
                self._setDrawer(XP.findElement(Polymer.dom(self), '.drawer:not([right])'));
                self._setRightDrawer(XP.findElement(Polymer.dom(self), '.drawer[right]'));
            }
        });
Polymer({

            // ELEMENT
            is: 'xp-iconset',

            // BEHAVIORS
            behaviors: [
                Polymer.XPIconsetFinder
            ],

            /*********************************************************************/

            /**
             * Fired when the iconset name changes.
             *
             * @event xp-iconset
             * @param {Element} firer
             * @param {string} name
             * @bubbles
             */

            /*********************************************************************/

            /**
             * Returns a copy of an iconset's icon.
             *
             * @method findIcon
             * @param {string} name
             * @returns {Node}
             */
            findIcon: function (name) {

                // Asserting
                XP.assertArgument(XP.isVoid(name) || XP.isString(name), 1, 'string');

                // Vars
                var self  = this,
                    wrap  = name ? XP.findElement(Polymer.dom(self), 'svg') : null,
                    icon  = wrap ? XP.getElement(Polymer.dom(wrap), 'g[id="' + name + '"]') : null,
                    clone = icon ? icon.cloneNode(true) : null;

                // Cleaning
                if (clone) { clone.removeAttribute('id'); }

                return clone;
            },

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The iconset's name.
                 *
                 * @attribute name
                 * @type string
                 * @default ""
                 */
                name: {
                    observer: '_nameChanged',
                    reflectToAttribute: true,
                    type: String,
                    value: ''
                }
            },

            /*********************************************************************/

            // OBSERVER
            _nameChanged: function () {

                // Firing
                this.fire('xp-iconset', {firer: this.icons[this.name] = this, name: this.name}, {node: window});
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-ink',

            // BEHAVIORS
            behaviors: [
                Polymer.MatInkBehavior
            ]
        });
Polymer({

            // ELEMENT
            is: 'mat-option',

            // BEHAVIORS
            behaviors: [
                Polymer.XPAnchorBehavior,
                Polymer.XPOverlayInjector,
                Polymer.MatPressedInkBehavior
            ],

            /*********************************************************************/

            // OBSERVERS
            observers: [
                '_toggleableChanged(toggleable)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * The option's arrow's direction.
                 *
                 * @attribute arrow
                 * @type "down" | "right"
                 */
                arrow: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, the label is displayed with bold weight.
                 *
                 * @attribute bold
                 * @type boolean
                 * @default false
                 */
                bold: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the label is displayed with hint opacity.
                 *
                 * @attribute hint
                 * @type boolean
                 * @default false
                 */
                hint: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The option's icon.
                 *
                 * @attribute icon
                 * @type string
                 */
                icon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The option's icon's src.
                 *
                 * @attribute icon-src
                 * @type string
                 */
                iconSrc: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, the element is indented.
                 *
                 * @attribute inset
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                inset: {
                    computed: '_computeInset(toggleable, icon, iconSrc)',
                    notify: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The option's keystroke.
                 *
                 * @attribute keystroke
                 * @type string
                 */
                keystroke: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The option's label.
                 *
                 * @attribute label
                 * @type string
                 */
                label: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The option's value.
                 *
                 * @attribute value
                 * @type string
                 * @default ""
                 */
                value: {
                    reflectToAttribute: true,
                    type: String,
                    value: ''
                }
            },

            /*********************************************************************/

            // COMPUTER
            _computeActive: function (toggleable, active) {
                return !toggleable && !!active;
            },

            // COMPUTER
            _computeInset: function (toggleable, icon, iconSrc) {
                return !!toggleable || !!icon || !!iconSrc;
            },

            // COMPUTER
            _computeLabel: function (label, value) {
                return label || value;
            },

            // COMPUTER
            _computeOpacity: function (hint) {
                return hint ? 'hint' : null;
            },

            /*********************************************************************/

            // OBSERVER
            _toggleableChanged: function () {

                // Vars
                var self = this;

                // Setting
                if (self.toggleable) { self.icon    = 'mat:check'; }
                if (self.toggleable) { self.iconSrc = ''; }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('option');
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-menu',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior,
                Polymer.XPMenuBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The menu's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "overlay"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'overlay'
                },

                /**
                 * The menu's z-axis position.
                 *
                 * @attribute z
                 * @type number
                 * @default 8
                 * @notifies
                 */
                z: {
                    notify: true,
                    reflectToAttribute: true,
                    type: Number,
                    value: 8
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-dropdown',

            // BEHAVIORS
            behaviors: [
                Polymer.MatInputBehavior,
                Polymer.XPRefirerBehavior,
                Polymer.XPSelectorBehavior
            ],

            /*********************************************************************/

            /**
             * Fired on hide.
             *
             * @event xp-hide
             * @param {Element} firer
             */

            /**
             * Fired on show.
             * @event xp-show
             * @param {Element} firer
             */

            /*********************************************************************/

            /**
             * Blurs the input.
             *
             * @method blur
             * @returns {Element}
             */
            blur: function () {
                var self = this;
                self.holder.blur();
                return self;
            },

            /**
             * Focuses the input.
             *
             * @method focus
             * @returns {Element}
             */
            focus: function () {
                var self = this;
                self.holder.focus();
                return self;
            },

            /**
             * Hides the dropdown.
             *
             * @method hide
             * @returns {Element}
             */
            hide: function () {
                var self = this;
                self.showed = false;
                return self._resize();
            },

            /**
             * Shows the dropdown.
             *
             * @method show
             * @returns {Element}
             */
            show: function () {
                var self = this;
                self.showed = true;
                return self._resize();
            },

            /**
             * Toggles the dropdown.
             *
             * @method toggle
             * @returns {Element}
             */
            toggle: function () {
                var self = this;
                self.showed = !self.showed;
                return self._resize();
            },

            /*********************************************************************/

            /**
             * Reflects the native input's `value` onto the element.
             *
             * @method _commitFrom
             * @returns {Element}
             * @private
             */
            _commitFrom: function () {

                // Vars
                var self = this;

                // Setting
                self.value = self.input.value;

                return self;
            },

            /**
             * Reflects the element's `tabIndex` onto the native input.
             *
             * @method _commitIndex
             * @param {number} value
             * @returns {Element}
             * @private
             */
            _commitIndex: function (value) {

                // Vars
                var self = this;

                // Setting
                self.holder.tabIndex = value;
                self.first.tabIndex  = value;

                return self;
            },

            /**
             * Reflects the element's `value` onto the native input.
             *
             * @method _commitTo
             * @returns {Element}
             * @private
             */
            _commitTo: function () {

                // Vars
                var self = this;

                // Setting
                if (self.value !== self.input.value) { self.input.value = self.value; }

                return self;
            },

            /**
             * Injects the native input.
             *
             * @method _inject
             * @returns {Element}
             * @private
             */
            _inject: function () {

                // Vars
                var self  = this,
                    input = document.createElement('input');

                // Setting
                XP.setAttribute(input, 'type', self.type);
                XP.setAttribute(input, 'value', self.value);

                // Appending
                self._setInput(Polymer.dom(self).appendChild(input));

                return self;
            },

            /**
             * Resizes the dropdown's overlay.
             *
             * @method _resize
             * @returns {Element}
             * @private
             */
            _resize: function () {

                // Vars
                var self = this;

                // Styling
                self.overlay.style.width = (self.holder.clientWidth - (self.fullWidth || self.pulldown ? 0 : 16)) + 'px';

                return self;
            },

            /**
             * Updates the native input's attributes.
             *
             * @method _update
             * @returns {Element}
             * @private
             */
            _update: function () {

                // Vars
                var self = this;

                // Setting
                XP.setAttribute(self.input, 'disabled', self.disabled);
                XP.setAttribute(self.input, 'name', self.name);
                XP.setAttribute(self.input, 'required', self.required);

                return self;
            },

            /**
             * Validates the native input's `value`.
             *
             * @method _validate
             * @param {boolean | string} [invalidMessage]
             * @returns {Element}
             * @private
             */
            _validate: function (invalidMessage) {

                // Asserting
                XP.assertArgument(XP.isVoid(invalidMessage) || XP.isFalse(invalidMessage) || XP.isString(invalidMessage), 1, 'string');

                // Vars
                var self = this;

                // Customizing
                if (invalidMessage !== undefined) { self.input.setCustomValidity(invalidMessage || ''); }

                // Setting
                self._setInvalidMessage(self.input.validationMessage || null);
                self._setInvalid(self.input.validity.valid === false);

                return self;
            },

            /*********************************************************************/

            // OBSERVERS
            observers: [
                'update(required)',
                '_optionsChanged(items.*, value)',
                '_selectionChanged(selection)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * The input's description.
                 *
                 * @attribute description
                 * @type string
                 */
                description: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The first dropdown's option.
                 *
                 * @attribute first
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                first: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the input's label is floated.
                 *
                 * @attribute floated
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                floated: {
                    computed: '_computeFloated(empty, floatingLabel, focused, fullWidth, label)',
                    notify: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the input's label will float above the input.
                 *
                 * @attribute floating-label
                 * @type boolean
                 * @default false
                 */
                floatingLabel: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the input is full width.
                 *
                 * @attribute full-width
                 * @type boolean
                 * @default false
                 */
                fullWidth: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the helper is hidden.
                 *
                 * @attribute helper-disabled
                 * @type boolean
                 * @default false
                 */
                helperDisabled: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The attribute used as index.
                 *
                 * @attribute index-attribute
                 * @type string
                 * @default "value"
                 */
                indexAttribute: {
                    type: String,
                    value: 'value'
                },

                /**
                 * The selector used to recognize items.
                 *
                 * @attribute item-selector
                 * @type string
                 * @default ".option"
                 */
                itemSelector: {
                    type: String,
                    value: '.option'
                },

                /**
                 * The dropdown's overlay.
                 *
                 * @attribute overlay
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                overlay: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the selected option is always on top.
                 *
                 * @attribute pulldown
                 * @type boolean
                 * @default false
                 */
                pulldown: {
                    observer: '_pulldownChanged',
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the input is required.
                 *
                 * @attribute required
                 * @type boolean
                 * @default false
                 */
                required: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the selected option is bold.
                 *
                 * @attribute selected-bold
                 * @type boolean
                 * @notifies
                 * @readonly
                 */
                selectedBold: {
                    notify: true,
                    readOnly: true,
                    type: Boolean
                },

                /**
                 * The selected option's color.
                 *
                 * @attribute selected-color
                 * @type string
                 * @notifies
                 * @readonly
                 */
                selectedColor: {
                    notify: true,
                    readOnly: true,
                    type: String
                },

                /**
                 * The selected option's label.
                 *
                 * @attribute selected-label
                 * @type string
                 * @notifies
                 * @readonly
                 */
                selectedLabel: {
                    notify: true,
                    readOnly: true,
                    type: String
                },

                /**
                 * The selected option's value.
                 *
                 * @attribute selected-value
                 * @type string
                 * @default ""
                 * @notifies
                 * @readonly
                 */
                selectedValue: {
                    notify: true,
                    readOnly: true,
                    type: String,
                    value: ''
                },

                /**
                 * If set to true, the dropdown's overlay is showed.
                 *
                 * @attribute showed
                 * @type boolean
                 * @default false
                 * @notifies
                 */
                showed: {
                    notify: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                }
            },

            /*********************************************************************/

            // COMPUTER
            _computeArrow: function (emptySelection, singleItem) {
                return emptySelection || !singleItem ? 'down' : null;
            },

            // COMPUTER
            _computeLabel: function (option) {
                return option && XP.isString(option.label || option.value) ? option.label || option.value : '';
            },

            // COMPUTER
            _computeValue: function (option) {
                return option && XP.isInput(option.value) ? option.value : '';
            },

            /*********************************************************************/

            // OBSERVER
            _optionsChanged: function () {

                // Vars
                var self     = this,
                    string   = XP.isInput(self.value) ? self.value.toString() : '',
                    selected = self.selection && self.selection.value.toString() === string,
                    item     = selected ? self.selection : self.findItem(function (item) { return item.getAttribute('value') === string; });

                // Checking
                if (selected) { return item; }

                // Selecting
                if (self.selection) { self.unselect(self.selection, true, true); }
                if (item) { self.select(item, true); }
            },

            // OBSERVER
            _pulldownChanged: function () {

                // Setting
                if (this.pulldown) { this.floatingLabel = false; }
            },

            // OBSERVER
            _selectionChanged: function () {

                // Setting
                if (this.selection) { this.value = this._computeValue(this.selection); }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('dropdown');
            },

            // LISTENER
            mutated: function () {

                // Vars
                var self = this;

                // Setting
                self._setSelectedBold((self.selection && self.selection.bold) || false);
                self._setSelectedColor((self.selection && self.selection.color) || null);
                self._setSelectedLabel(self._computeLabel(self.selection));
                self._setSelectedValue(self._computeValue(self.selection));

                // Observing
                XP.onMutation(self, self.mutated.bind(self), {attributes: true, attributeFilter: ['active', 'bold', 'current-color', 'label', 'value'], subtree: true});
            },

            // LISTENER
            ready: function () {

                // Vars
                var self = this,
                    root = Polymer.dom(self.root);

                // Setting
                self._setFirst(root.querySelector('.first'));
                self._setOverlay(root.querySelector('.overlay'));

                // Mutating
                self.mutated();
            },

            /*********************************************************************/

            // HANDLER
            _handleActivate: function (event) {

                // Selecting
                this.select(event.detail.firer);
            },

            // HANDLER
            _handleRefire: function (event) {

                // Refiring
                this.refire(event, event.type, {firer: this});
            },

            // HANDLER
            _handleShow: function (event) {

                // Showing
                return event.stopPropagation() || this.show();
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-fab',

            // BEHAVIORS
            behaviors: [
                Polymer.XPAnchorBehavior,
                Polymer.XPOverlayInjector,
                Polymer.MatPressedPaperBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * If set to true, the element is aligned across two elements.
                 *
                 * @attribute across
                 * @type boolean
                 * @default false
                 */
                across: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The button's active icon.
                 *
                 * @attribute active-icon
                 * @type string
                 */
                activeIcon: {
                    observer: '_activeIconChanged',
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The button's active icon's src.
                 *
                 * @attribute active-icon-src
                 * @type string
                 */
                activeIconSrc: {
                    observer: '_activeIconChanged',
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, both icon and active icon are set.
                 *
                 * @attribute animated
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                animated: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The paper's background.
                 *
                 * @attribute background
                 * @type string
                 * @default "deep-orange-600"
                 */
                background: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'deep-orange-600'
                },

                /**
                 * If set to true, the element is hidden.
                 *
                 * @attribute hidden
                 * @type boolean
                 * @default false
                 * @notifies
                 */
                hidden: {
                    notify: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The button's icon.
                 *
                 * @attribute icon
                 * @type string
                 */
                icon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The button's icon's src.
                 *
                 * @attribute icon-src
                 * @type string
                 */
                iconSrc: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, the element is aligned to the left.
                 *
                 * @attribute left
                 * @type boolean
                 * @default false
                 */
                left: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the element has 40px diameter instead of 56px.
                 *
                 * @attribute mini
                 * @type boolean
                 * @default false
                 */
                mini: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the element is aligned to the top.
                 *
                 * @attribute top
                 * @type boolean
                 * @default false
                 */
                top: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The fab's z-axis position.
                 *
                 * @attribute z
                 * @type number
                 * @default 6
                 * @notifies
                 */
                z: {
                    notify: true,
                    reflectToAttribute: true,
                    type: Number,
                    value: 6
                }
            },

            /*********************************************************************/

            // OBSERVER
            _activeIconChanged: function () {

                // Setting
                this._setAnimated(!!this.activeIcon || !!this.activeIconSrc);
            },

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Setting
                this.across = this.across || !!XP.findParentElement(this, '.header');
            },

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('fab');
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-icon-button',

            // BEHAVIORS
            behaviors: [
                Polymer.XPAnchorBehavior,
                Polymer.XPOverlayInjector,
                Polymer.MatPressedInkBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The button's active icon.
                 *
                 * @attribute active-icon
                 * @type string
                 */
                activeIcon: {
                    observer: '_activeIconChanged',
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The button's active icon's src.
                 *
                 * @attribute active-icon-src
                 * @type string
                 */
                activeIconSrc: {
                    observer: '_activeIconChanged',
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, both icon and active icon are set.
                 *
                 * @attribute animated
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                animated: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the icon is dimmed when not active.
                 *
                 * @attribute dimmed
                 * @type boolean
                 * @default false
                 */
                dimmed: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The button's icon.
                 *
                 * @attribute icon
                 * @type string
                 */
                icon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The button's icon's src.
                 *
                 * @attribute icon-src
                 * @type string
                 */
                iconSrc: {
                    reflectToAttribute: true,
                    type: String
                }
            },

            /*********************************************************************/

            // COMPUTER
            _computeOpacity: function (active, dimmed) {
                return !active && dimmed ? 'hint' : 'icon';
            },

            /*********************************************************************/

            // OBSERVER
            _activeIconChanged: function () {

                // Setting
                this._setAnimated(!!this.activeIcon || !!this.activeIconSrc);
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('button');
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-header',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The header's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "toolbar"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'toolbar'
                },

                /**
                 * The navigation drawer.
                 *
                 * @attribute drawer
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                drawer: {
                    notify: true,
                    observer: '_drawerChanged',
                    readOnly: true
                },

                /**
                 * If set to true, the extended is indented.
                 *
                 * @attribute inset
                 * @type boolean
                 * @default false
                 */
                inset: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the nav is showed.
                 *
                 * @attribute nav
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                nav: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The header's panel's scroll amount.
                 *
                 * @attribute scrolled
                 * @type number
                 * @default 0
                 * @readonly
                 */
                scrolled: {
                    readOnly: true,
                    type: Number,
                    value: 0
                },

                /**
                 * The header's top distance.
                 *
                 * @attribute top
                 * @type number
                 * @default 0
                 * @readonly
                 */
                top: {
                    readOnly: true,
                    type: Number,
                    value: 0
                }
            },

            /*********************************************************************/

            // OBSERVER
            _drawerChanged: function () {

                // Vars
                var self   = this,
                    empty  = (self.drawer && self.drawer.empty) || false,
                    narrow = (self.drawer && self.drawer.narrow) || false;

                // Disconnecting
                if (self.drawerObserver) { self.drawerObserver.disconnect(); }

                // Setting
                self._setNav(narrow && !empty);

                // Observing
                if (self.drawer) { self.drawerObserver = XP.onMutation(self.drawer, self._drawerChanged.bind(self), {attributes: true, attributeFilter: ['empty', 'narrow']}); }
            },

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Vars
                var self   = this,
                    drawer = XP.findParentElement(Polymer.dom(self), '.drawer'),
                    panel  = XP.findParentElement(Polymer.dom(self), '.drawer-panel');

                // Setting
                self._setDrawer((!drawer && panel && panel.drawer) || null);

                // Delaying
                if (!self.drawwer) { XP.delay(function () { self._setDrawer((!drawer && panel && panel.drawer) || null); }, 2, true); }
            },

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('header');
            },

            // LISTENER
            detached: function () {

                // Setting
                this._setDrawer(null);
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-header-panel',

            /*********************************************************************/

            /**
             * Resets the scroll.
             *
             * @method resetScroll
             * @returns {Element}
             */
            resetScroll: function () {
                var self = this;
                self.scroller.scrollTop = 0;
                return self;
            },

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The panel's footer.
                 *
                 * @attribute footer
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                footer: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The panel's header.
                 *
                 * @attribute header
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                header: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the body is indented.
                 *
                 * @attribute inset
                 * @type boolean
                 * @default false
                 */
                inset: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The panel's scroll mode.
                 *
                 * @attribute mode
                 * @type "fixed" | "seamed" | "waterfall"
                 * @notifies
                 */
                mode: {
                    notify: true,
                    observer: '_modeChanged',
                    reflectToAttribute: true,
                    type: String,
                    value: null
                },

                /**
                 * If set to true, the material spacing rules are applied.
                 *
                 * @attribute padding
                 * @type boolean
                 * @default false
                 */
                padding: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the panel is raised.
                 *
                 * @attribute raised
                 * @type boolean
                 * @default false
                 * @notifies
                 */
                raised: {
                    notify: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The panel's scroll amount.
                 *
                 * @attribute scrolled
                 * @type number
                 * @default 0
                 * @notifies
                 * @readonly
                 */
                scrolled: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Number,
                    value: 0
                },

                /**
                 * The panel's scrolling element.
                 *
                 * @attribute scroller
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                scroller: {
                    notify: true,
                    observer: '_scrollerChanged',
                    readOnly: true
                },

                /**
                 * The panel's header's translate amount.
                 *
                 * @attribute translated
                 * @type number
                 * @default 0
                 * @notifies
                 * @readonly
                 */
                translated: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Number,
                    value: 0
                }
            },

            /**
             * The list of scroll modes.
             *
             * @property modes
             * @type Array
             * @default ["fixed", "seamed", "waterfall"]
             * @readonly
             */
            modes: ['fixed', 'seamed', 'waterfall'],

            /*********************************************************************/

            // COMPUTER
            _computeRaised: function (mode, scrolled, translated) {
                return mode === 'fixed' || (mode !== 'seamed' && (mode === 'waterfall' ? scrolled : translated) > 0);
            },

            /*********************************************************************/

            // OBSERVER
            _modeChanged: function () {

                // Setting
                this._setScroller(Polymer.dom(this.root).querySelector(this.mode === 'fixed' || this.mode === 'waterfall' ? '.body' : '.main'));
            },

            // OBSERVER
            _scrollerChanged: function (post, pre) {

                // Classifying
                if (pre) { pre.classList.remove('scroller'); }
                if (post) { post.classList.add('scroller'); }
            },

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Handling
                this._handleScroll();
            },

            // LISTENER
            created: function () {

                // Clasifying
                this.classList.add('header-panel');
            },

            // LISTENER
            ready: function () {

                // Vars
                var self = this;

                // Setting
                self._setFooter(Polymer.dom(self.root).querySelector('.footer'));
                self._setHeader(Polymer.dom(self.root).querySelector('.header'));
            },

            /*********************************************************************/

            // HANDLER
            _handleScroll: function () {

                // Vars
                var self = this,
                    pre  = self.scrolled,
                    post = self.scroller.scrollTop;

                // Setting
                self._setScrolled(post);
                self._setTranslated(!self.mode && pre > post ? post : self.translated);

                // Styling
                self.header.style.transform = self.translated ? 'translateY(' + self.translated + 'px)' : '';
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-label',

            // EXTENDS
            extends: 'label',

            // BEHAVIORS
            behaviors: [
                Polymer.XPLabelBehavior
            ]
        });
Polymer({

            // ELEMENT
            is: 'mat-item',

            // BEHAVIORS
            behaviors: [
                Polymer.XPAnchorBehavior,
                Polymer.XPOverlayInjector,
                Polymer.XPRefirerBehavior,
                Polymer.MatPressedBehavior
            ],

            /*********************************************************************/

            /**
             * Fired when the active state changes.
             *
             * @event xp-active
             * @param {Element} firer
             * @param {boolean} isActive
             * @param {boolean} isSecondary
             * @bubbles
             */

            /**
             * Fired when the element is clicked.
             *
             * @event xp-activate
             * @param {Element} firer
             * @param {Element} target
             * @param {*} data
             * @param {boolean} isActive
             * @param {boolean} isSecondary
             * @bubbles
             * @cancelable
             */

            /*********************************************************************/

            // OBSERVERS
            observers: [
                '_primaryChanged(active, disabled, primaryAction, primaryType, toggleable)',
                '_secondaryChanged(disabled, secondaryAction)',
                '_secondaryDataChanged(data, secondaryAction)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * The item's description.
                 *
                 * @attribute description
                 * @type string
                 */
                description: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * If set to true, the text is empty.
                 *
                 * @attribute empty
                 * @type boolean
                 * @default true
                 * @notifies
                 * @readonly
                 */
                empty: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: true
                },

                /**
                 * If set to true, the element's content is positioned inline.
                 *
                 * @attribute inline
                 * @type boolean
                 * @default false
                 */
                inline: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the element is indented.
                 *
                 * @attribute inset
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                inset: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The item's label.
                 *
                 * @attribute label
                 * @type string
                 */
                label: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The item's primary action.
                 *
                 * @attribute primary-action
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                primaryAction: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The item's primary action's type.
                 *
                 * @attribute primary-type
                 * @type string
                 * @notifies
                 * @readonly
                 */
                primaryType: {
                    computed: '_computeType(primaryAction)',
                    notify: true,
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The item's secondary action.
                 *
                 * @attribute secondary-action
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                secondaryAction: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The item's secondary text.
                 *
                 * @attribute secondary-text
                 * @type string
                 */
                secondaryText: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The item's secondary action's type.
                 *
                 * @attribute secondary-type
                 * @type string
                 * @notifies
                 * @readonly
                 */
                secondaryType: {
                    computed: '_computeType(secondaryAction)',
                    notify: true,
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The item's text.
                 *
                 * @attribute text
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                text: {
                    notify: true,
                    readOnly: true
                }
            },

            /*********************************************************************/

            // COMPUTER
            _computeActive: function (active, type) {
                return !!active && type !== 'checkbox';
            },

            // COMPUTER
            _computeType: function (action) {
                if (!action) { return null; }
                if (action.type === 'checkbox') { return 'checkbox'; }
                if (action.classList.contains('avatar')) { return 'avatar'; }
                return 'button';
            },

            /*********************************************************************/

            // OBSERVER
            _primaryChanged: function () {

                // Vars
                var self = this;

                // Setting
                self._setInset(!!self.primaryAction);

                // Checking
                if (!self.primaryAction) { return; }

                // Overriding
                if (self.primaryType === 'checkbox') { self.toggleable = true; }

                // Setting
                self.primaryAction.toggleable = self.toggleable;
                self.primaryAction.disabled   = self.disabled;
                self.primaryAction.data       = self.data;
                self.primaryAction.checked    = self.active;
                self.primaryAction.active     = self.active;
            },

            // OBSERVER
            _secondaryChanged: function () {

                // Vars
                var self = this;

                // Checking
                if (!self.secondaryAction) { return; }

                // Setting
                self.secondaryAction.disabled = self.disabled;
                self.secondaryAction.data     = self.data;
            },

            // OBSERVER
            _secondaryDataChanged: function () {

                // Setting
                if (this.secondaryAction) { this.secondaryAction.data = this.data; }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('item');
            },

            // LISTENER
            mutated: function () {

                // Vars
                var self = this;

                // Setting
                self._setEmpty(!XP.hasChildren(Polymer.dom(self.text)));
                self._setPrimaryAction(XP.findElement(Polymer.dom(self), '.primary'));
                self._setSecondaryAction(XP.findElement(Polymer.dom(self), '.secondary'));
            },

            // LISTENER
            ready: function () {

                // Vars
                var self = this;

                // Setting
                self._setText(Polymer.dom(self.root).querySelector('.text'));

                // Observing
                Polymer.dom(self).observeNodes(self.mutated.bind(self));
            },

            /*********************************************************************/

            // HANDLER
            _handleAnchor: function (event) {

                // Vars
                var self = this;

                // Checking
                if (self.secondaryAction && Polymer.dom(event).path.indexOf(self.secondaryAction) >= 0) { return; }

                // Super
                Polymer.XPAnchorBehavior._anchorHandler.apply(self, arguments);
            },

            // HANDLER
            _handlePrevent: function (event) {

                // Preventing
                event.selectPrevented = true;
            },

            // HANDLER
            _handleRefire: function (event) {

                // Refiring
                this.refire(event, event.type, {firer: this, isSecondary: true});
            },

            // HANDLER
            _handleStop: function (event) {

                // Stopping
                event.stopPropagation();
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-list',

            // BEHAVIORS
            behaviors: [
                Polymer.XPListBehavior
            ]
        });
Polymer({

            // ELEMENT
            is: 'mat-page',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior,
                Polymer.XPPageBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The page's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "transparent"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'transparent'
                },

                /**
                 * If set to true, the material spacing rules are applied.
                 *
                 * @attribute padding
                 * @type boolean
                 * @default false
                 */
                padding: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-pages',

            // BEHAVIORS
            behaviors: [
                Polymer.XPPagesBehavior
            ],

            /*********************************************************************/

            // OBSERVERS
            observers: [
                '_selectionChanged(items.*, selection, slider)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * The tag used to append new items.
                 *
                 * @attribute item-tag
                 * @type string
                 * @default "mat-page"
                 * @readonly
                 */
                itemTag: {
                    readOnly: true,
                    type: String,
                    value: 'mat-page'
                },

                /**
                 * The pages slider.
                 *
                 * @attribute slider
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                slider: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the pages are sliding.
                 *
                 * @attribute sliding
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                sliding: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                }
            },

            /*********************************************************************/

            // OBSERVER
            _selectionChanged: function() {

                // Vars
                var self  = this,
                    items = self.items || [],
                    index = XP.indexOf(items, self.selection) || 0;

                // Setting
                self._setSliding(true);

                // Styling
                self.slider.style.transform = 'translateX(' + (index && (-index * 100 / items.length)) + '%)';
                self.slider.style.width     = (items.length * 100) + '%';

                // Debouncing
                self.debounce('sliding', self._setSliding.bind(self, false), 330);
            },

            /*********************************************************************/

            // LISTENER
            ready: function () {

                // Setting
                this._setSlider(Polymer.dom(this.root).querySelector('.slider'));
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-radio',

            // BEHAVIORS
            behaviors: [
                Polymer.XPArrayBehavior,
                Polymer.MatInputBehavior
            ],

            /*********************************************************************/

            /**
             * Blurs the input.
             *
             * @method blur
             * @returns {Element}
             */
            blur: function () {
                var self = this;
                self.holder.blur();
                return self;
            },

            /**
             * Focuses the input
             *
             * @method focus
             * @returns {Element}
             */
            focus: function () {
                var self = this;
                self.holder.focus();
                return self;
            },

            /*********************************************************************/

            /**
             * Reflects the native input's `value` onto the element.
             *
             * @method _commitFrom
             * @returns {Element}
             * @private
             */
            _commitFrom: function () {

                // Vars
                var self = this;

                // Setting
                self.checked = self.input.checked;
                self.value   = self.input.value;

                return self;
            },

            /**
             * Reflects the element's `tabIndex` onto the native input.
             *
             * @method _commitIndex
             * @param {number} value
             * @returns {Element}
             * @private
             */
            _commitIndex: function (value) {

                // Vars
                var self = this;

                // Setting
                self.holder.tabIndex = value;

                return self;
            },

            /**
             * Reflects the element's `value` onto the native input.
             *
             * @method _commitTo
             * @returns {Element}
             * @private
             */
            _commitTo: function () {

                // Vars
                var self = this;

                // Setting
                if (self.checked !== self.input.checked) { self.input.checked = self.checked; }
                if (self.value !== self.input.value ) { self.input.value = self.value; }

                return self;
            },

            /**
             * Injects the native input.
             *
             * @method _inject
             * @returns {Element}
             * @private
             */
            _inject: function () {

                // Vars
                var self  = this,
                    input = document.createElement('input');

                // Setting
                XP.setAttribute(input, 'checked', self.checked);
                XP.setAttribute(input, 'type', self.type);
                XP.setAttribute(input, 'value', self.value);

                // Appending
                self._setInput(Polymer.dom(self).appendChild(input));

                return self;
            },

            /**
             * Updates the native input's attributes.
             *
             * @method _update
             * @returns {Element}
             * @private
             */
            _update: function () {

                // Vars
                var self = this;

                // Setting
                XP.setAttribute(self.input, 'disabled', self.disabled);
                XP.setAttribute(self.input, 'name', self.name);
                XP.setAttribute(self.input, 'type', self.type);
                XP.setAttribute(self.input, 'value', self.value);

                return self;
            },

            /**
             * Validates the native input's `value`.
             *
             * @method _validate
             * @param {boolean | string} [invalidMessage]
             * @returns {Element}
             * @private
             */
            _validate: function (invalidMessage) {

                // Asserting
                XP.assertArgument(XP.isVoid(invalidMessage) || XP.isFalse(invalidMessage) || XP.isString(invalidMessage), 1, 'string');

                // Vars
                var self = this;

                // Customizing
                if (XP.isDefined(invalidMessage)) { self.input.setCustomValidity(invalidMessage || ''); }

                // Setting
                self._setInvalidMessage(self.input.validationMessage || null);
                self._setInvalid(self.input.validity.valid === false);

                return self;
            },

            /*********************************************************************/

            // LISTENERS
            listeners: {
                'keyup': '_handleToggle'
            },

            // OBSERVERS
            observers: [
                '_checkedChanged(checked)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * If set to true, the input is empty.
                 *
                 * @attribute empty
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                empty: {
                    notify: true,
                    readOnly: true,
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * If set to true, the check is right floated.
                 *
                 * @attribute flip
                 * @type boolean
                 * @default false
                 */
                flip: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The input's type.
                 *
                 * @attribute type
                 * @type string
                 * @default "radio"
                 */
                type: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'radio'
                }
            },

            /**
             * The list of instances.
             *
             * @property instances
             * @type Array
             * @default []
             * @readonly
             */
            instances: [],

            /*********************************************************************/

            // OBSERVERS
            _checkedChanged: function () {

                // Vars
                var self = this;

                // Checking
                if (!self.checked) { return; }

                // Updating
                XP.forEach(self.instances, function (radio) { if (radio !== self && radio.name === self.name && radio.domHost === self.domHost && radio.form === self.form) { radio.checked = false; } });
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('radio');
            },

            // LISTENER
            ready: function () {

                // Appending
                this.append('instances', this);
            },

            /*********************************************************************/

            // HANDLER
            _handleToggle: function (event) {

                // Toggling
                if (!event.button && (!event.keyCode || event.keyCode === 32)) { this.checked = true; }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-shell',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior,
                Polymer.XPShellBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The shell's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "backdrop"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'backdrop'
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-tab',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPressedBehavior,
                Polymer.XPTabBehavior
            ],

            /*********************************************************************/

            // OBSERVERS
            observers: [
                '_closableChanged(closerDisabled, closable, modified)',
                '_dataChanged(closer, data)'
            ],

            // PROPERTIES
            properties: {

                /**
                 * The tab's closer.
                 *
                 * @attribute closer
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                closer: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The tab's closer's active icon, used when modified is true.
                 *
                 * @attribute closer-active-icon
                 * @type string
                 */
                closerActiveIcon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The tab's closer's active icon's src, used when modified is true.
                 *
                 * @attribute closer-active-icon-src
                 * @type string
                 */
                closerActiveIconSrc: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * Determines how the closer behaves in relation to its target.
                 *
                 * @attribute closer-behavior
                 * @type "inject" | "toggle"
                 * @default "toggle"
                 */
                closerBehavior: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'toggle'
                },

                /**
                 * If set to true, the tab's closer is disabled.
                 *
                 * @attribute closer-disabled
                 * @type boolean
                 * @default false
                 */
                closerDisabled: {
                    reflectToAttribute: true,
                    type: Boolean,
                    value: false
                },

                /**
                 * The tab's closer's icon
                 *
                 * @attribute closer-icon
                 * @type string
                 */
                closerIcon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The tab's closer's icon's src
                 *
                 * @attribute closer-icon-src
                 * @type string
                 */
                closerIconSrc: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The tab's closer's target.
                 *
                 * @attribute closer-target
                 * @type Element | string
                 * @notifies
                 */
                closerTarget: {
                    notify: true
                },

                /**
                 * The tab's icon.
                 *
                 * @attribute icon
                 * @type string
                 */
                icon: {
                    reflectToAttribute: true,
                    type: String
                },

                /**
                 * The tab's icon's src.
                 *
                 * @attribute icon-src
                 * @type string
                 */
                iconSrc: {
                    reflectToAttribute: true,
                    type: String
                }
            },

            /*********************************************************************/

            // OBSERVER
            _closableChanged: function () {

                // Vars
                var self   = this,
                    closer = self.closer || (self.closable && document.createElement('mat-icon-button'));

                // CASE: closable
                if (self.closable) {

                    // Classifying
                    closer.classList.add('closer');

                    // Setting
                    closer.active        = self.modified;
                    closer.activeIcon    = self.closerTarget && !self.closerActiveIcon ? 'mat:arrow-drop-down-circle' : self.closerActiveIcon;
                    closer.activeIconSrc = self.closerActiveIconSrc;
                    closer.behavior      = self.closerBehavior;
                    closer.disabled      = self.closerDisabled;
                    closer.icon          = self.closerIcon || 'mat:cancel';
                    closer.iconSrc       = self.closerIconSrc;
                    closer.target        = self.modified ? self.closerTarget : null;

                    // Checking
                    if (self.closer) { return; }

                    // Listening
                    self.listen(closer, 'xp-activate', '_closeHandler');

                    // Appending
                    self._setCloser(Polymer.dom(self).appendChild(closer));
                }

                // CASE: not closable
                else if (closer) {

                    // Unlistening
                    self.unlisten(closer, 'xp-activate', '_closeHandler');

                    // Removing
                    self._setCloser(Polymer.dom(self).removeChild(closer) && null);
                }
            },

            // OBSERVER
            _dataChanged: function () {

                // Setting
                if (this.closer) { this.closer.data = this.data; }
            }
        });
Polymer({

            // ELEMENT
            is: 'mat-tabs',

            // BEHAVIORS
            behaviors: [
                Polymer.XPTabsBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The tabs bar.
                 *
                 * @attribute bar
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                bar: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * The tag used to append new items.
                 *
                 * @attribute item-tag
                 * @type string
                 * @readonly
                 */
                itemTag: {
                    readOnly: true,
                    type: String,
                    value: 'mat-tab'
                },

                /**
                 * The tabs wrapper.
                 *
                 * @attribute wrapper
                 * @type Element
                 * @notifies
                 * @readonly
                 */
                wrapper: {
                    notify: true,
                    readOnly: true
                }
            },

            /*********************************************************************/

            // LISTENER
            attached: function () {

                // Listening
                this.listen(window, 'resize', '_resizeHandler');
            },

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('extended');
            },

            // LISTENER
            detached: function () {

                // Unlistening
                this.unlisten(window, 'resize', '_resizeHandler');
            },

            // LISTENER
            ready: function () {

                // Vars
                var self = this;

                // Setting
                self._setBar(Polymer.dom(self.root).querySelector('.bar'));
                self._setWrapper(Polymer.dom(self.root).querySelector('.wrapper'));
            },

            /*********************************************************************/

            // HANDLER
            _mutationHandler: function () {

                // Vars
                var self = this;

                // Super
                Polymer.XPTabsBehaviorImp._mutationHandler.apply(self, arguments);

                // Vars
                var item    = self.selection && XP.getBoundings(self.selection),
                    wrapper = self.selection && XP.getBoundings(self.wrapper);

                // Styling
                self.bar.style.transform = 'translateX(' + (item ? item.left - wrapper.left : 0) + 'px)';
                self.bar.style.width     = item ? item.width + 'px' : 0;
            },

            // HANDLER
            _resizeHandler: XP.debounce(function () {

                // Handling
                this._mutationHandler();
            })
        });
Polymer({

            // ELEMENT
            is: 'mat-toolbar',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The toolbar's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "toolbar"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'toolbar'
                },

                /**
                 * The toolbar's alignment.
                 *
                 * @attribute justified
                 * @type "around" | "between" | "center" | "end" | "start"
                 */
                justified: {
                    reflectToAttribute: true,
                    type: String
                }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('toolbar');
            }
        });
Polymer({

            // ELEMENT
            is: 'xp-page',

            // BEHAVIORS
            behaviors: [
                Polymer.XPPageBehavior
            ]
        });
Polymer({

            // ELEMENT
            is: 'xp-pages',

            // BEHAVIORS
            behaviors: [
                Polymer.XPPagesBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The tag used to append new items.
                 *
                 * @attribute item-tag
                 * @type string
                 * @default "xp-page"
                 * @readonly
                 */
                itemTag: {
                    readOnly: true,
                    type: String,
                    value: 'xp-page'
                }
            }
        });
Polymer({

            // ELEMENT
            is: 'xp-router',

            // BEHAVIORS
            behaviors: [
                Polymer.XPSelectorBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The selected route's params.
                 *
                 * @attribute params
                 * @type Object
                 * @notifies
                 * @readonly
                 */
                params: {
                    notify: true,
                    readOnly: true,
                    type: Object
                },

                /**
                 * The selector used to recognize items.
                 *
                 * @attribute item-selector
                 * @type string
                 * @default ".route"
                 */
                itemSelector: {
                    reflectToAttribute: true,
                    type: String,
                    value: '.route'
                },

                /**
                 * The router instance.
                 *
                 * @attribute router
                 * @type Object
                 * @notifies
                 * @readonly
                 */
                router: {
                    notify: true,
                    readOnly: true
                },

                /**
                 * If set to true, the router is running.
                 *
                 * @attribute running
                 * @type boolean
                 * @default false
                 * @notifies
                 * @readonly
                 */
                running: {
                    notify: true,
                    readOnly: true,
                    type: Boolean,
                    value: false
                }
            },

            /*********************************************************************/

            // OBSERVER
            _itemsObserver: function () {

                // Vars
                var self = this;

                // Super
                Polymer.XPSelectorBehaviorImp._itemsObserver.apply(self, arguments);

                // Checking
                if (self.running || !self.items || !self.items.length) { return; }

                // Routing
                self.async(function () { self.items.forEach(function (route) { self.router.on(route.path, self._handleRoute.bind(self, route)); }); });

                // Running
                self._setRunning(!!self.router.run());
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('router');
            },

            // LISTENER
            ready: function () {

                // Setting
                this._setRouter(new XPRouter());
            },

            /*********************************************************************/

            // HANDLER
            _handleRoute: function (route, params) {

                // Vars
                var self = this;

                // Redirecting
                if (route.redirect) { return XP.redirect(route.redirect, true); }

                // Setting
                XP.delay(self._setParams.bind(self, params));

                // Selecting
                XP.delay(self.select.bind(self, route, true));
            }
        });
Polymer({

            // ELEMENT
            is: 'xp-selector',

            // BEHAVIORS
            behaviors: [
                Polymer.XPSelectorMultiBehavior
            ]
        });
Polymer({

            // ELEMENT
            is: 'xp-meta',

            // BEHAVIORS
            behaviors: [
                Polymer.XPObjectBehavior,
                Polymer.XPSharedBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {

                /**
                 * The meta data.
                 *
                 * @attribute data
                 * @type Object
                 * @notifies
                 * @readonly
                 */
                data: {
                    notify: true,
                    readOnly: true,
                    type: Object,
                    value: function () { return {}; }
                },

                /**
                 * The shared path.
                 *
                 * @attribute path
                 * @type string
                 */
                path: {
                    type: String
                }
            },

            /*********************************************************************/

            // LISTENER
            created: function () {

                // Classifying
                this.classList.add('meta');
            },

            // LISTENER
            mutated: function () {

                // Vars
                var self = this;

                // Parsing
                XP.findElements(Polymer.dom(self), 'property[path]:not([path=""])').forEach(function (property) {

                    // Vars
                    var path  = property.getAttribute('path'),
                        value = XP.toValue(property.getAttribute('value'));

                    // Setting
                    self.enforce('data.' + path, value);

                    // Sharing
                    if (self.path) { self.share(self.path + '.' + path, value); }
                });
            },

            // LISTENER
            ready: function () {

                // Observing
                Polymer.dom(this).observeNodes(this.mutated.bind(this));
            }
        });
Polymer({
            // ELEMENT
            is: 'app-page-home',

            behaviors: [
                Polymer.AppCommonBehavior
            ]
        });
Polymer({
            // ELEMENT
            is: 'app-page-localization',

            behaviors: [
                Polymer.AppCommonBehavior
            ]
        });
Polymer({
            // ELEMENT
            is: 'app-page-routing',

            behaviors: [
                Polymer.AppCommonBehavior
            ]
        });
Polymer({
            // ELEMENT
            is: 'app-page-theming',

            behaviors: [
                Polymer.AppCommonBehavior
            ]
        });
Polymer({
            // ELEMENT
            is: 'app-shell',

            // BEHAVIORS
            behaviors: [
                Polymer.MatPaperBehavior,
                Polymer.XPShellBehavior,
                Polymer.AppCommonBehavior
            ],

            /*********************************************************************/

            // PROPERTIES
            properties: {
                /**
                 * The shell's brightness.
                 *
                 * @attribute brightness
                 * @type string
                 * @default "backdrop"
                 */
                brightness: {
                    reflectToAttribute: true,
                    type: String,
                    value: 'backdrop'
                }
            },

            _handleInstall: function () {
                console.log('Service worker installed!');
            }
        });