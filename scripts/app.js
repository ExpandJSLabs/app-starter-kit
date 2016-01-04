(function () {
    var d = document.createDocumentFragment();
    
    // Polyfill import
    var s = document.createElement('script');
    s.type="text/javascript";
    s.src = 'bower_components/webcomponentsjs/webcomponents-lite.min.js';
    d.appendChild(s);
    
    // Elements import
    var l = document.createElement('link');
    l.rel = 'import';
    l.href = 'elements/elements.html';
    d.appendChild(l);
    
    // Attaching to DOM
    document.head.appendChild(d);
}())
