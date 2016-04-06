/*
 * L.Polyline is used to display polylines on a map.
 */

L.Polyline = L.Path.extend({
	initialize: function (latlngs, options) {
		L.Path.prototype.initialize.call(this, options);

		this._latlngs = this._convertLatLngs(latlngs);
	},

	options: {
		// how much to simplify the polyline on each zoom level
		// more = better performance and smoother look, less = more accurate
		smoothFactor: 1.0,
		noClip: false
	},

	projectLatlngs: function () {
		this._originalPoints = [];

		for (var i = 0, len = this._latlngs.length; i < len; i++) {
			this._originalPoints[i] = this._map.latLngToLayerPoint(this._latlngs[i]);
		}
	},

	getPathString: function () {
		for (var i = 0, len = this._parts.length, str = ''; i < len; i++) {
			str += this._getPathPartStr(this._parts[i]);
		}
		return str;
	},

	getLatLngs: function () {
		return this._latlngs;
	},

	setLatLngs: function (latlngs) {
		this._latlngs = this._convertLatLngs(latlngs);
		return this.redraw();
	},

	addLatLng: function (latlng) {
		this._latlngs.push(L.latLng(latlng));
		return this.redraw();
	},

	spliceLatLngs: function () { // (Number index, Number howMany)
		var removed = [].splice.apply(this._latlngs, arguments);
		this._convertLatLngs(this._latlngs, true);
		this.redraw();
		return removed;
	},

	closestLayerPoint: function (p) {
		var minDistance = Infinity, parts = this._parts, p1, p2, minPoint = null;

		for (var j = 0, jLen = parts.length; j < jLen; j++) {
			var points = parts[j];
			for (var i = 1, len = points.length; i < len; i++) {
				p1 = points[i - 1];
				p2 = points[i];
				var sqDist = L.LineUtil._sqClosestPointOnSegment(p, p1, p2, true);
				if (sqDist < minDistance) {
					minDistance = sqDist;
					minPoint = L.LineUtil._sqClosestPointOnSegment(p, p1, p2);
				}
			}
		}
		if (minPoint) {
			minPoint.distance = Math.sqrt(minDistance);
		}
		return minPoint;
	},

	getBounds: function () {
		return new L.LatLngBounds(this.getLatLngs());
	},

	_convertLatLngs: function (latlngs, overwrite) {
		var i, len, target = overwrite ? latlngs : [];

		for (i = 0, len = latlngs.length; i < len; i++) {
			if (L.Util.isArray(latlngs[i]) && typeof latlngs[i][0] !== 'number') {
				return;
			}
			target[i] = L.latLng(latlngs[i]);
		}
		return target;
	},

	_initEvents: function () {
		L.Path.prototype._initEvents.call(this);
	},

	_getPathPartStr: function (points) {
		var round = L.Path.VML;

		for (var j = 0, len2 = points.length, str = '', p; j < len2; j++) {
			p = points[j];
			if (round) {
				p._round();
			}
			str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
		}
		return str;
	},

	_clipPoints: function () {
		var points = this._originalPoints,
				len = points.length,
				i, k, segment;

		if (this.options.noClip) {
			this._parts = [points];
			return;
		}

		this._parts = [];

		var parts = this._parts,
				vp = this._map._pathViewport,
				lu = L.LineUtil;

		for (i = 0, k = 0; i < len - 1; i++) {
			segment = lu.clipSegment(points[i], points[i + 1], vp, i);
			if (!segment) {
				continue;
			}

			parts[k] = parts[k] || [];
			parts[k].push(segment[0]);

			// if segment goes out of screen, or it's the last one, it's the end of the line part
			if ((segment[1] !== points[i + 1]) || (i === len - 2)) {
				parts[k].push(segment[1]);
				k++;
			}
		}
	},

	// simplify each clipped part of the polyline
	_simplifyPoints: function () {
		var parts = this._parts,
				lu = L.LineUtil;

		for (var i = 0, len = parts.length; i < len; i++) {
			parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
		}
	},

	_updatePath: function () {
		if (!this._map) { return; }

		this._clipPoints();
		this._simplifyPoints();

		L.Path.prototype._updatePath.call(this);

//		this.addVerticesOnEnds();
	},

	addVertex: function(point) {
		var _this = this;
		var namespace = 'http://www.w3.org/2000/svg';
		var vertex = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		vertex = document.createElementNS(namespace, 'circle');
		vertex.setAttributeNS(null, 'r', this.options.weight*1.5);
		vertex.setAttributeNS(null, 'cx', point.x);
		vertex.setAttributeNS(null, 'cy', point.y);
		vertex.setAttributeNS(null, 'fill', this.options.color);
		vertex.setAttributeNS(null, 'fill-opacity', 0.5);
		this._vertices = this._vertices || document.createElementNS(namespace, 'g');
		this._vertices.appendChild(vertex);
		vertex.onclick = function(e) {
			_this.trigger('vertex:click', vertex, this);
		};
		vertex.onmouseover = function(e) {
			_this.trigger('vertex:mouseover', vertex, this);
		};
		vertex.onmouseout = function(e) {
			_this.trigger('vertex:mouseout', vertex, this);
		};
		return vertex;
	},

	addVertices: function (list) {
		if (!list) {
			return;
		}
		this.removeVertices();
		var namespace = 'http://www.w3.org/2000/svg';
		this._vertices = document.createElementNS(namespace, 'g');
		this._path.parentElement.appendChild(this._vertices);

		for (var i = 0; i < list.length; i++) {
			this.addVertex(list[i]);
		}
	},

	addVerticesOnEnds: function() {
		var points = this._originalPoints;
		this.addVertices([points[0],points[points.length-1]]);
	},

	removeVertices: function() {
		if (this._vertices){this._path.parentElement.removeChild(this._vertices);}
	}


});

L.polyline = function (latlngs, options) {
	return new L.Polyline(latlngs, options);
};
