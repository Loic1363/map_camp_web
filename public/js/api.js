/**
 * Simple API wrapper around fetch()
 * Automatically adds JSON headers and JWT token when available.
 */

const API = {
    token: null,

    setToken(jwt) {
        this.token = jwt;
        if (jwt) {
            localStorage.setItem("token", jwt);
        } else {
            localStorage.removeItem("token");
        }
    },

    clearToken() {
        this.setToken(null);
    },

    loadToken() {
        const jwt = localStorage.getItem("token");
        if (jwt) this.token = jwt;
    },

    async request(method, url, data = null) {
        const options = {
            method,
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (this.token) {
            options.headers["Authorization"] = "Bearer " + this.token;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        let payload = null;
        try {
            payload = await response.json();
        } catch (_) {
            payload = null;
        }

        if (!response.ok) {
            const error = new Error((payload && payload.error) || "Unknown error");
            error.status = response.status;
            throw error;
        }

        return payload;
    },


    register(email, password) {
        return this.request("POST", "/api/register", { email, password });
    },

    login(email, password) {
        return this.request("POST", "/api/login", { email, password });
    },


    getMarkers() {
        return this.request("GET", "/api/markers");
    },

    createMarker(marker) {
        return this.request("POST", "/api/markers", marker);
    },

    updateMarker(id, marker) {
        return this.request("PUT", `/api/markers/${id}`, marker);
    },

    deleteMarker(id) {
        return this.request("DELETE", `/api/markers/${id}`);
    }
};

API.loadToken();
