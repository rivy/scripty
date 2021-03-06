"use strict";
(function() {

    class Scripty extends HTMLElement {

        static get observedAttributes() {
            return ['packages', 'oncomplete', 'locals'];
        }

        // A getter for a packages property.
        get packages() {
            return this.getAttribute('packages');
        }

        // A getter for a oncomplete property.
        get oncomplete() {
            return this.getAttribute('oncomplete');
        }

        // A getter for a locals property.
        get locals() {
            return this.getAttribute('locals');
        }

        // A getter for a apiBase property.
        get apiBase() {
            return 'http://api.jsdelivr.com/v1/jsdelivr/libraries';
        }

        // A getter for a jscdn property.
        get jsdelivr() {
            return 'https://cdn.jsdelivr.net';
        }

        // Can define constructor arguments if you wish.
        constructor() {
            // If you define a ctor, always call super() first!
            // This is specific to CE and required by the spec.
            super();
            //internal properties 
            this._counter = 0;
            this._packages = [];
            this._locals = undefined;

            document.addEventListener("DOMContentLoaded", () => this.windowLoaded());
            console.info('Scripty initilized');
        }

        // Only called for the packages attribute due to observedAttributes
        attributeChangedCallback(name, oldValue, newValue) {
            this._counter += 1;
            if (this._counter === this.attributes.length) {
                //all properties been loaded
                let packs = this.preparePackages(this.packages);
                this.loadPackages(packs);
            }
        }

        //prepare packages array and asign to _packages 
        preparePackages(packs) {
            packs.split(',').forEach(pack => {
                let details = pack.split('@');
                this._packages.push({
                    name: details[0],
                    version: details[1]
                })
            });
            return this._packages;
        };

        loadPackages(packages) {
            let proms = [],
                proms2 = [];
            packages.forEach(pack => {
                let promise = new Promise((resolve, reject) => {
                    let url = this.packageUrl(pack);
                    proms2.push(this.appendScript(url));
                    resolve(pack);
                });
                proms.push(promise);
            });
            Promise.all(proms).then((packs) => {
                packs.forEach(pack => console.info(`${pack.name}@${pack.version}`));
                Promise.all(proms2).then(() => {
                    if (this.locals)
                        this.locals.split(',').forEach(local => this.appendScript(this.locals));
                });
            });
        }

        packageUrl(pack) {
            //minimatch replacement 
            pack.name = pack.name.replace(' ', '*');
            if (pack.version) {
                let packInfo = this.getPackageVersion(pack.name, pack.version);
                if (packInfo) {
                    return `${this.jsdelivr}/${packInfo.name}/${packInfo.version}/${packInfo.mainfile}`;
                }
                console.warn(`Can't find package for ${pack.name}@${pack.version}`);
                return;
            } else {
                let packInfo = this.getPackageInfo(pack.name)[0];
                if (packInfo) {
                    pack.version = packInfo.lastversion;
                    return `${this.jsdelivr}/${packInfo.name}/${packInfo.lastversion}/${packInfo.mainfile}`;
                }
                console.warn(`Can't find package for ${pack.name}`);
                return undefined;
            }
        }

        getPackageInfo(packageName) {
            let baseUri = `${this.apiBase}?name=${packageName}&fields=name,lastversion,mainfile`;
            return JSON.parse(this.httpsync(baseUri));
        }

        getPackageVersion(packageName, version) {
            let baseUri = `${this.apiBase}?name=${packageName}&fields=name,assets`;
            let json = JSON.parse(this.httpsync(baseUri));
            let foundPackage = undefined;
            if (json.length > 0) {
                //taking the first element in the search result 
                //used every as we need to break the loop at specific condition which doesn't work in for each
                json[0].assets.every((asset, index) => {
                    if (version === asset.version) {
                        console.info(`Found matching version for ${json[0].name}@${asset.version}`);
                        foundPackage = asset;
                        foundPackage.name = json[0].name;
                        return false;
                    }
                    return true;
                });
            }
            return foundPackage;
        }

        appendScript(filename) {
            let pr = new Promise((resolve, reject) => {
                if (filename) {
                    eval(this.httpsync(filename));
                }
                resolve(filename);
            });
            return pr;
        }

        httpsync(url) {
            var xhrObj = new XMLHttpRequest();
            xhrObj.open('GET', url, false);
            xhrObj.send('');
            return xhrObj.responseText;
        }

        callback(resolve, filename) {
            resolve();
        }

        //we are delaying the loading of the package to load any other script to use it in oncpmlete event 
        windowLoaded() {
            console.info('On complete fired');
            if (this.oncomplete)
                eval(this.oncomplete);
        }
    }
    customElements.define('script-y', Scripty);

})();