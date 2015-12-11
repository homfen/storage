/**
 *
 * 通用storage方案，兼容localStorage、sessionStorage、userData
 * 强依赖于JSON
 *
 * @file storage
 * @author homfen (homfen@outlook.com)
 * @version 0.0.1
 */
define(
    function (require) {

        var GLOBALNAME = 'storage-global';
        var GLOBALINDEX = GLOBALNAME + '-index';
        var host = location.hostname;
        var path = location.pathname;
        var topHash = location.hash.slice(1);
        var defaultStorage = null;

        function available() {
            return getStorage();
        }

        function getStorage() {
            if (defaultStorage) {
                return defaultStorage;
            }

            if ('localStorage' in window) {
                try {
                    window.localStorage.setItem('_tmptest', 'tmpval');
                    window.localStorage.removeItem('_tmptest');
                    defaultStorage = window.localStorage;
                }
                catch (ex) {}
            }

            if (!defaultStorage && 'sessionStorage' in window) {
                try {
                    window.sessionStorage.setItem('_tmptest', 'tmpval');
                    window.sessionStorage.removeItem('_tmptest');
                    defaultStorage = window.sessionStorage;
                }
                catch (ex) {}
            }

            if (defaultStorage) {
                return defaultStorage;
            }

            var link = document.createElement('link');
            if (link.addBehavior) {
                link.style.behavior = 'url(#default#userData)';
                document.getElementsByTagName('head')[0].appendChild(link);

                defaultStorage = {
                    setItem: function (key, value) {
                        link.setAttribute('key', value);
                        link.save(GLOBALNAME);
                    },
                    getItem: function (key) {
                        link.load(GLOBALNAME);
                        return link.getAttribute(key);
                    },
                    removeItem: function (key) {
                        link.load(GLOBALNAME);
                        link.removeAttribute(key);
                        link.save(GLOBALNAME);
                    }
                };
                return defaultStorage;
            }

            link = null;
            return null;
        }

        function setItem(key, value, expire, hash) {
            key = getRealKey(key, hash);
            addKey(key, expire);
            setRealItem(key, value);
        }

        function getItem(key, hash) {
            key = getRealKey(key, hash);
            var expire = getExpire(key);
            if (expire && expire > (new Date().getTime())) {
                return getRealItem(key);
            }

            removeKey(key);
            setRealItem(key, null);
            return null;
        }

        function removeItem(key, hash) {
            key = getRealKey(key, hash);
            removeKey(key);
            setRealItem(key, null);
        }

        function clear(hostName) {
            hostName = hostName ? hostName : host;
            var allKeys = getAllKeys();
            var hostKeys = allKeys[hostName];
            for (var key in hostKeys) {
                if (hostKeys.hasOwnProperty(key)) {
                    delete hostKeys[key];
                    setRealItem(key, null);
                }
            }
            delete allKeys[hostName];
        }

        function clearAll() {
            var allKeys = getAllKeys();
            for (var hostName in allKeys) {
                if (allKeys.hasOwnProperty(hostName)) {
                    var hostKeys = allKeys[hostName];
                    for (var key in hostKeys) {
                        if (hostKeys.hasOwnProperty(key)) {
                            delete hostKeys[key];
                            setRealItem(key, null);
                        }
                        delete allKeys[hostName];
                    }
                }
            }
        }

        function index() {
            return getAllKeys();
        }

        function setRealItem(key, value) {
            getStorage();
            if (defaultStorage) {
                if (value) {
                    if (!isString(value)) {
                        value = JSON.stringify(value);
                    }
                    defaultStorage.setItem(key, value);
                }
                else {
                    defaultStorage.removeItem(key);
                }
            }
        }

        function getRealItem(key) {
            getStorage();
            if (defaultStorage) {
                return defaultStorage.getItem(key);
            }
            return null;
        }

        function getRealKey(key, hash) {
            return host + path
                + '#' + (hash ? hash : topHash)
                + '@' + key;
        }

        function getAllKeys() {
            var allKeys = getRealItem(GLOBALINDEX);
            return JSON.parse(allKeys);
        }

        function addKey(key, expire) {
            expire = expire ? expire : Number.MAX_VALUE;
            var allKeys = getAllKeys();
            var hostKeys = allKeys[host];
            if (hostKeys) {
                hostKeys[key] = expire;
            }
            else {
                allKeys[host] = {key: expire};
            }
            setRealItem(GLOBALINDEX, JSON.stringify(allKeys));
        }

        function removeKey(key) {
            var allKeys = getAllKeys();
            var hostKeys = allKeys[host];
            if (hostKeys && hostKeys[key]) {
                delete hostKeys[key];
            }
            setRealItem(GLOBALINDEX, JSON.stringify(allKeys));
        }

        function getExpire(key) {
            var allKeys = getAllKeys();
            var hostKeys = allKeys[host];
            return hostKeys ? hostKeys[key] : null;
        }

        function isString(obj) {
            return Object.prototype.toString.call(obj).slice(8, -1) === 'String';
        }

        var storage = {
            available: available,
            setItem: setItem,
            getItem: getItem,
            removeItem: removeItem,
            clear: clear,
            clearAll: clearAll,
            index: index
        };

        return storage;
    }
);
