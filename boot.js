const ian = {
    // server addresses
    endpointServers: ["https://iamnbd2022.github.io/iandns/"],
    currentEndpointServer: '',
    currentHost: '',
    endpoints:[],

    // load files
    loadHost: () => {
        if (ian.currentHost) {
            return ian.currentHost;
        }
        const metas = document.getElementsByTagName('meta');
        for (let i = 0; i < metas.length; i++) {
            if (metas[i].hasAttribute('host')) {
                ian.currentHost = metas[i].getAttribute('host');
                break;
            }
        }
        return ian.currentHost;
    },

    loadEndpointServers: () => {
        if (!ian.endpointServers || !ian.endpointServers.length) {
            return false;
        }
        //endpointServers.push("");
        ian.currentEndpointServer = ian.endpointServers.find(ep => ian.isWorking(ep, 'ping.txt'));
        return ian.currentEndpointServer != null;
    },

    isWorking: (url, suffix) => {
        let healthUrl = url + (suffix || '/_health_');
        // debugger;
        let resp = ian.getObject(healthUrl, false);
        return resp === 'pong';
    },

    loadIndex: (url) => {
        url += "/index.js?ian-host=" + ian.loadHost();
        ian.loadJs(url);
        return true;
    },

    loadJs: (url) => {
        let tag = document.createElement("script");
        tag.src = url;
        document.getElementsByTagName("head")[0].appendChild(tag);
    },

    selectServer: () => {
        // Do nothing
    },

    getJson: (path) => {
        let url = ian.findServerUrl() + "/" + path;
        return ian.getObject(url, true);
    },

    getObject: (url, isJson) => {
        let xmlHttp = new XMLHttpRequest();
        if (url) {
            url += '?ian-host=' + ian.loadHost();
        }
        xmlHttp.open("GET", url, false);

        // xmlHttp.setRequestHeader("ian-host", ian.loadHost());
        xmlHttp.send(null);
        // deal with error
        if (xmlHttp.status > 399) {
            console.error(`Failed to send request to url[${url}] with status code[${xmlHttp.status} and message:${xmlHttp.responseText}`);
            return null;
        }
        // xmlHttp.error()
        if (isJson) {
            return JSON.parse(xmlHttp.responseText);
        } else {
            return xmlHttp.responseText;
        }
    },

    findServerUrl: () => {
        if (!ian.currentEndpointServer) {
            if (!ian.loadEndpointServers()) {
                console.warn('No available endpoint server');
                return null;
            }
        }
        let esUrl = ian.currentEndpointServer + ian.loadHost() + '.json';
        let resp = ian.getObject(esUrl, true);
        // check main endpoint
        let mainEp = resp.mainEndPoint;
        if (mainEp && ian.isWorking(mainEp)) {
            ian.endpoints.push(mainEp);
            return mainEp;
        }
        let endpoints = resp.endpoints;
        if (endpoints) {
            ian.endpoints = ian.endpoints.concat(endpoints);
            // debugger;
            for (let item of endpoints) {
                let endpoint = item.endpoint;
                if (ian.isWorking(endpoint)) {
                    return endpoint;
                } else {
                    console.error("Cannot connect to endpoint:", endpoint);
            }
        }
    }
    },

    boot: () => {
        let endpoint = ian.findServerUrl();
        if (endpoint == null) {
            // TODO: load server address
        } else {
            console.info("Connecting to endpoint:", endpoint);
            ian.loadIndex(endpoint);
        }
    },

    reload: (host) => {
        ian.currentHost = host;
        ian.boot();
    },

    injectImgs: (doc) => {
        let imgs = document.getElementsByTagName("img");
        if (imgs) {
            for (let img of imgs) {
                ian.injectImg(img);
            }
        }
    },

    injectImg: (imgTag) => {
        if (!imgTag) {
            return;
        }
        imgTag.onerror = (event) => {
                let src = imgTag.originalSrc || imgTag.src;
                if (src.startsWith(document.location.origin)) {
                    src = src.substring(document.location.origin.length);
                }
                if (imgTag.complete && imgTag.naturalHeight !== 0 && src && src.length && src.substring(0, 1) == "/") {
                    for (let ep of ian.endpoints) {
                        if (ian.isWorking(ep.endpoint)) {
                            imgTag.src = ep.endpoint + src;
                            break;
                       }
                    }
                    imgTag.originalSrc = src;
                }
            };
    }
};

if (window && ian) {
    window.ian = ian;
}
// start booting...
ian.boot();