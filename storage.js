/**
 *
 * 通用storage方案，兼容localStorage、sessionStorage、userData
 * 强依赖于JSON
 *
 * @file storage
 * @author homfen (homfen@outlook.com)
 * @version 0.0.2
 */
'use strict'

;(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    }
    else if (typeof exports === 'object') {
        module.exports = factory();
    }
    else {
        root.storage = factory();
    }
})(this,
    function () {
        var GLOBALNAME = 'storage-global';
        var GLOBALINDEX = GLOBALNAME + '-index';
        var host = location.hostname;
        var path = location.pathname;
        var topHash = location.hash.slice(1);
        var defaultStorage = null;

        /**
         * 检测storage是否可用
         *
         * @return {Object}
         */
        function available() {
            return getStorage();
        }

        /**
         * 获取storage对象
         *
         * @return {Object} storage对象
         */
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

        /**
         * set方法
         *
         * @param {string} key 键
         * @param {string} value 值
         * @param {number} expire 过期时间
         * @param {string} hash hash值
         */
        function setItem(key, value, expire, hash) {
            key = getRealKey(key, hash);
            addKey(key, expire);
            setRealItem(key, value);
        }

        /**
         * get方法
         *
         * @param {string} key 键
         * @param {string} hash 如果是子action需要传hash
         * @return {string}
         */
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

        /**
         * remove方法
         *
         * @param {string} key 键
         * @param {string} hash 如果是子action需要传hash
         */
        function removeItem(key, hash) {
            key = getRealKey(key, hash);
            removeKey(key);
            setRealItem(key, null);
        }

        /**
         * clear方法
         *
         * @param {string} hostName 域名，如果有则清除指定域名的数据，否则默认清除当前域名的数据
         */
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

        /**
         * clearAll方法，清除所有的数据
         */
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

        /**
         * index方法，列出所有的key
         *
         * @return {Object}
         */
        function index() {
            var allKeys = getAllKeys();
            var r = [];
            for (var hostName in allKeys) {
                if (allKeys.hasOwnProperty(hostName)) {
                    var hostKeys = allKeys[hostName];
                    for (var key in hostKeys) {
                        if (hostKeys.hasOwnProperty(key)) {
                            r.push(key.split('@')[1]);
                        }
                    }
                }
            }
            return r;
        }

        /**
         * setRealItem方法
         *
         * @param {string} key 真实的key
         * @param {string} value 值
         */
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

        /**
         * getRealItem方法
         *
         * @param {string} key 真实的key
         * @return {string}
         */
        function getRealItem(key) {
            getStorage();
            if (defaultStorage) {
                return defaultStorage.getItem(key);
            }
            return null;
        }

        /**
         * getRealKey方法
         *
         * @param {string} key 传入的key
         * @param {string} hash 如果在子action需要传入hash值，以便保存到正确的位置
         * @return {string}
         */
        function getRealKey(key, hash) {
            return host + path
                + '#' + (hash ? hash : topHash)
                + '@' + key;
        }

        /**
         * getAllKeys获取所有的key
         *
         * @return {Object}
         */
        function getAllKeys() {
            var allKeys = getRealItem(GLOBALINDEX);
            return JSON.parse(allKeys);
        }

        /**
         * addKey增加一个key
         *
         * @param {string} key 真实的key
         * @param {number} expire 过期时间
         */
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

        /**
         * removeKey移除key
         *
         * @param {string} key 真实的key
         */
        function removeKey(key) {
            var allKeys = getAllKeys();
            var hostKeys = allKeys[host];
            if (hostKeys && hostKeys[key]) {
                delete hostKeys[key];
            }
            setRealItem(GLOBALINDEX, JSON.stringify(allKeys));
        }

        /**
         * getExpire获取key对应的过期时间
         *
         * @param {string} key 真实的key
         * @return {number}
         */
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
