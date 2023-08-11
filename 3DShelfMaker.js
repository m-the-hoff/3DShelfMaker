/*jshint esversion: 6 */


var X = 0;
var Y = 1;
var Z = 2;

const NodeType = {
	Bottom: 0,
	Top: 1,
	Left: 2,
	Right: 3,
	BottomRight: 4,
	BottomLeft: 5,
	TopRight: 6,
	TopLeft: 7,
	Inner: 8
};


/**********************************************************
DebugLog
**********************************************************/

class DebugLog {

	maxEntries = 10;
	logEntries = [];

	constructor() {
		this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
		this.textBlock = new BABYLON.GUI.TextBlock();
		this.textBlock.color = "white";
		this.textBlock.fontSize = 16;
		this.textBlock.position = new BABYLON.Vector3(0, 300, -50);
		this.advancedTexture.addControl(this.textBlock);
	}

	clear() {
		this.logEntries = [];
	}


	log(text) {
		this.logEntries.push(text);
		if (this.logEntries.length >= this.maxEntries) {
			this.logEntries.shift();
		}
		this.draw();
	}

	draw() {
		var fullText = "";
		for (var n = 0; n < this.logEntries.length; n++) {
			fullText = fullText + this.logEntries[n] + "\n";
		}

		this.textBlock.text = fullText;
	}
};



/**********************************************************
ShelfStyle
**********************************************************/
class ShelfStyle {

	styleSheet;

	constructor(styleSheet) {
		if (styleSheet == null) {
			this.styleSheet = {
				"thickness": .25, // thickness of shelf in inches
				"minDepth": 3, // minimum depth of shelf in inches
				"maxDepth": 8, // maximum depth of shelf in inches
				"depthIncrement": 0.25, // 1/4" increments in depth
				"minShelfLength": 10, // minimum shelf length tip-to-tip in inches
				"maxShelfLength": 20, // minimum shelf length tip-to-tip in inches
				"shelfLengthIncrement": 0.125, // shelf length increment. NOTE: This will not hold true once adjusted to maintain angles
				"minAngle": 30, // minimum angle of shelf connections
				"maxAngle": 100, // maximum angle of shelf connections
				"angleIncrement": 5, // angle is rounded to 5°
				"minShelvesPerNode": 3, // maximum shelves that join in same node
				"maxShelvesPerNode": 7, // maximum shelves that join in same node
				"flatShelfRatio": 0.1, // ratio of flat (parallel to ground) shelves
				"material": null, // material to use on shelf surface like wood grain
			};
		} else {
			this.styleSheet = styleSheet;
		}
	}

	get(key) {
		return this.styleSheet[key];
	}

};


/**********************************************************
Shelf
**********************************************************/
class Shelf {
	shelfStyle = {};
	vertices = [];
	faces = [];
	polyhedron = null;
	params = {};


	constructor(params, shelfStyle = null) {

		this.params = params;

		if (shelfStyle == null) {
			this.shelfStyle = new ShelfStyle();
		} else {
			this.shelfStyle = shelfStyle;
		}

		this.faces = [
			[6, 7, 8, 9, 10, 11], // shelf front
			[5, 4, 3, 2, 1, 0], // shelf back
			[1, 2, 8, 7], // left bottom edge face
			[3, 9, 8, 2], // left top edge face
			[6, 11, 5, 0], // right bottom edge face
			[11, 10, 4, 5], // right top edge face
			[4, 10, 9, 3], // shelf top face
			[1, 7, 6, 0] // shelf bottom face
		];

		this.vertices = this.createShelfVertices(params);


		this.polyhedron = BABYLON.MeshBuilder.CreatePolyhedron(
			"Polyhedron", {
				name: "Shelf",
				custom: this.createPolyhedronCustomInfo(this.vertices, this.faces),
				updatable: true,
				size: 3 // initial scale
			},
			params["scene"]
		);


		this.polyhedron.convertToFlatShadedMesh();
		this.polyhedron.material = params["material"];
	}

	setParent(parentNode) {
		this.polyhedron.parent = parentNode;
	}

	moveRelative(x, y, z) {
		this.polyhedron.position.x += x;
		this.polyhedron.position.y += y;
		this.polyhedron.position.z += z;
	}

	moveTo(x, y, z) {
		this.polyhedron.position.x = x;
		this.polyhedron.position.y = y;
		this.polyhedron.position.z = z;
	}

	rotateX(degrees) {
		this.polyhedron.rotation.x = this.degreesToRadians(degrees);
	}

	rotateY(degrees) {
		this.polyhedron.rotation.y = this.degreesToRadians(degrees);
	}

	rotateZ(degrees) {
		this.polyhedron.rotation.z = this.degreesToRadians(degrees);
	}

	/**************************************************************
	* Create a shelf with the specific characteristics in params
	*
	* Valid params entries (* = required):
	*   material     * The material to use
	*   length       * The length of shelf from tip-to-tip including bevels
	*   thickness    * The thickness of the shelf
	*   leftDepth    * How deep the left end of shelf is
	*   rightDepth   * How deep the right end of shelf is
	*		leftAngleA     Angle with next shelf A on left end
	*   leftAngleB		 Angle with next shelf B on left end
	*		rightAngleA    Angle with next shelf A on right end
	*   rightAngleB		 Angle with next shelf B on right end


	     |<--------- Length ----------->|

	        A                         A
	       ____________________________             ____v____
	Left	/                            \  Right     Thickness
				\____________________________/            _________
	                                                    ^
				  B                         B

	**********************************************************/

	createPolyhedronCustomInfo(vertices, faces) {

		return {
			//"name": "Shelf",
			//"category": ["Octahedron"],
			"vertex": vertices,
			"face": faces
		};
	}



	findBevelWidthAdjustment(deltaDepth, length, bevelLength) {
		// var angle = Math.atan(deltaDepth / length );
		// return Math.tan(angle) * bevelLength;

		// ratio of deltaDepth to length is same as bevelDelta to bevelLength
		return deltaDepth * bevelLength / length;
	}



	createShelfVertices(params) {

		var leftDepth = params["leftDepth"];
		var rightDepth = params["rightDepth"];
		var length = params["length"];
		var thickness = this.shelfStyle.get("thickness");

		var vertices = [
			[0, -0.5, 0], // 0
			[1, -0.5, 0], // 1
			[1, 0, 0], // 2
			[1, 0.5, 0], // 3
			[0, 0.5, 0], // 4
			[0, 0, 0], // 5
			[0, -0.5, 1], // 6
			[1, -0.5, 1], // 7
			[1, 0, 1], // 8
			[1, 0.5, 1], // 9
			[0, 0.5, 1], // 10
			[0, 0, 1] // 11
		];

		// left front vertices are: 7,8,9

		vertices[7][Z] = vertices[1][Z] + leftDepth;
		vertices[8][Z] = vertices[2][Z] + leftDepth;
		vertices[9][Z] = vertices[3][Z] + leftDepth;

		// right front vertices are: 6,10,11

		vertices[6][Z] = vertices[0][Z] + rightDepth;
		vertices[10][Z] = vertices[4][Z] + rightDepth;
		vertices[11][Z] = vertices[5][Z] + rightDepth;

		// right vertex to left vertex mapping
		// 0 => 1
		// 4 => 3
		// 5 => 2
		// 6  => 7
		// 10 => 9
		// 11 => 8

		// Set all Right side vertices to x=0
		vertices[0][X] = 0;
		vertices[4][X] = 0;
		vertices[5][X] = 0;
		vertices[6][X] = 0;
		vertices[10][X] = 0;
		vertices[11][X] = 0;

		// Set all Left side vertices to x=length

		vertices[1][X] = length;
		vertices[2][X] = length;
		vertices[3][X] = length;
		vertices[7][X] = length;
		vertices[8][X] = length;
		vertices[9][X] = length;


		// bevel tips are at full length
		// vertices[2][X] = vertices[1][X];
		// vertices[8][X] = vertices[7][X];
		// vertices[5][X] = vertices[0][X];
		// vertices[11][X] = vertices[6][X];

		// bottom to top vertex mapping
		// 0 => 4
		// 1 => 3
		// 6 => 10
		// 7 => 9


		var halfThickness = thickness / 2.0;

		vertices[3][Y] = halfThickness;
		vertices[4][Y] = halfThickness;
		vertices[9][Y] = halfThickness;
		vertices[10][Y] = halfThickness;

		vertices[0][Y] = -halfThickness;
		vertices[1][Y] = -halfThickness;
		vertices[6][Y] = -halfThickness;
		vertices[7][Y] = -halfThickness;


		// calculate angled ends. left vertices: 2, 8

		vertices[2][Y] = 0;
		vertices[8][Y] = 0;

		// calculate angled ends. right vertices: 5, 11

		vertices[5][Y] = 0;
		vertices[11][Y] = 0;

		this.setEndAngles(params, vertices);


		//var vertBuffer = this.flattenVertices(vertices);
		//this.polyhedron.updateVerticesData(BABYLON.VertexBuffer.PositionKind, vertBuffer);
		//this.polyhedron.convertToFlatShadedMesh();

		return vertices;
	}

	setNewVertices(vertices) {
		var positions = this.polyhedron.getVerticesData(BABYLON.VertexBuffer.PositionKind);
		var idx = 0;
		for (var v = 0; v < vertices.length; v++) {
			positions[idx++] = vertices[v][X];
			positions[idx++] = vertices[v][Y];
			positions[idx++] = vertices[v][Z];
		}
		this.polyhedron.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
	}

	flattenVertices(vertices) {
		var vertBuffer = [];
		for (var v = 0; v < vertices.length; v++) {
			vertBuffer.push(vertices[v][X]);
			vertBuffer.push(vertices[v][Y]);
			vertBuffer.push(vertices[v][Z]);
		}

		return vertBuffer;
	}

	degreesToRadians(angleInDegrees) {
		return angleInDegrees * Math.PI / 180.0;
	}


	setEndAngles(params, vertices) {
		var thickness = this.shelfStyle.get("thickness");

		var length = params["length"];
		var deltaDepth = params["leftDepth"] - params["rightDepth"];
		var setBack;

		if ('leftAngleA' in this.params) {
			setBack = this.calculateCornerSetBackAmount(params["leftAngleA"], thickness, deltaDepth, length);

			vertices[3][X] -= setBack.x;
			vertices[9][X] -= setBack.x;

			vertices[9][Z] -= setBack.z;
		}

		if ('leftAngleB' in this.params) {
			setBack = this.calculateCornerSetBackAmount(params["leftAngleB"], thickness, deltaDepth, length);
			vertices[7][X] -= setBack.x;
			vertices[1][X] -= setBack.x;

			vertices[7][Z] -= setBack.z;
		}

		if ('rightAngleA' in this.params) {
			setBack = this.calculateCornerSetBackAmount(params["rightAngleA"], thickness, deltaDepth, length);

			vertices[10][X] += setBack.x;
			vertices[4][X] += setBack.x;

			vertices[10][Z] += setBack.z;
		}

		if ('rightAngleB' in this.params) {
			setBack = this.calculateCornerSetBackAmount(params["rightAngleB"], thickness, deltaDepth, length);

			vertices[6][X] += setBack.x;
			vertices[0][X] += setBack.x;

			vertices[6][Z] += setBack.z;
		}
	}


	calculateCornerSetBackAmount(angleInDegrees, thickness, deltaDepth, length) {
		var angleRadians = this.degreesToRadians(angleInDegrees);

		// opposite / adjacent = tan( angle )
		// adjacent = opposite / tan (angle )
		//
		// since two shelves meet, each is only 1/2 the inside angle
		// 1/2 shelf thickness is opposite side of right triangle

		var oppositeSide = thickness / 2.0;
		var x = oppositeSide / Math.tan(angleRadians / 2.0);

		var z = deltaDepth * x / length;

		return {
			"x": x,
			"z": z
		};
	}

}; // end of class Shelf


/**********************************************************
ShelfNode
**********************************************************/
class ShelfNode {
	shelves = [];
	angles = [];
	startAngle = 0;
	endAngle = 0;
	shelfStyle;
	transformNode = null;
	nodeType;


	constructor(scene, parent, nodeType, shelfStyle) {
		this.scene = scene;
		this.shelfStyle = shelfStyle;
		this.transformNode = new BABYLON.TransformNode("ShelfNode", scene);
		this.transformNode.parent = parent;

		this.nodeType = nodeType;
		this.debugLog = new DebugLog();
	}


	randomNumber(minVal, maxVal, incr) {
		var range = Math.ceil((maxVal - minVal) / incr);
		return minVal + Math.floor(Math.random() * range) * incr;
	}


	calculateShelfAngles() {
		var minAngle = this.shelfStyle.get("minAngle");
		var maxAngle = this.shelfStyle.get("maxAngle");
		var angleIncrement = this.shelfStyle.get("angleIncrement");

		var minMaxLookup = new Map([
			// start angle, end angle, random start min/max, random end min/max
			[NodeType.Bottom, [0, 180, 30, 50, 30, 50]],
			[NodeType.Top, [180, 360, 10, 30, 10, 30]],
			[NodeType.Right, [90, 270, 20, 50, 20, 50]],
			[NodeType.Left, [270, 450, 20, 50, 20, 50]],
			[NodeType.BottomRight, [90, 180, -10, 10, 20, 40]],
			[NodeType.BottomLeft, [0, 90, 20, 40, -10, 10]],
			[NodeType.TopRight, [180, 270, 20, 50, 20, 50]],
			[NodeType.TopLeft, [270, 360, 20, 50, 20, 50]],
			[NodeType.Inner, [0, 360, 0, 0, 0, 0]]
		]);

		var minMax = minMaxLookup.get(this.nodeType);
		this.startAngle = minMax[0];
		this.endAngle = minMax[1];
		var startMinRand = minMax[2];
		var startMaxRand = minMax[3];
		var endMinRand = minMax[4];
		var endMaxRand = minMax[5];

		this.startAngle += this.randomNumber(startMinRand, startMaxRand, angleIncrement);
		this.endAngle -= this.randomNumber(endMinRand, endMaxRand, angleIncrement);

		var currentAngle = this.startAngle;

		while (currentAngle < this.endAngle) {

			var angle = this.randomNumber(minAngle, maxAngle, angleIncrement);
			if (angle > this.endAngle - currentAngle - minAngle) {
				angle = this.endAngle - currentAngle;
			}
			this.angles.push(angle);
			currentAngle += angle;
		}

		if (this.endAngle - this.startAngle < 360) {
			this.angles.push(360 - (this.endAngle - this.startAngle));
		}

		return {
			"start": this.startAngle,
			"angles": this.angles
		};
	}

	populateNode() {
		var shelfAngleInfo = this.calculateShelfAngles();
		var numShelves = shelfAngleInfo.angles.length;


		var nodeDepth = this.randomNumber(this.shelfStyle.get("minDepth"),
			this.shelfStyle.get("maxDepth"),
			this.shelfStyle.get("depthIncrement"));

		var currentAngle = shelfAngleInfo.start;
		var shelfAngles = shelfAngleInfo.angles;

		// TODO: Add random determination if flat shelf to be included

		for (var s = 0; s < numShelves; s++) {
			var prevAngle;
			var nextAngle = shelfAngles[s];

			if (s > 0) {
				prevAngle = shelfAngles[s - 1];
			} else {
				prevAngle = shelfAngles[shelfAngles.length - 1];
			}

			var length = this.randomNumber(this.shelfStyle.get("minShelfLength"),
				this.shelfStyle.get("maxShelfLength"),
				this.shelfStyle.get("shelfLengthIncrement"));

			var shelfColorMaterial = new BABYLON.StandardMaterial("mat" + s.toString(), this.scene);
			shelfColorMaterial.alpha = 1.0;
			shelfColorMaterial.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());

			this.params = {
				"scene": this.scene,
				"material": shelfColorMaterial,
				"length": length,
				"thickness": this.shelfStyle.get("thickness"),
				"leftDepth": nodeDepth,
				"rightDepth": nodeDepth,
				"leftAngleA": 45, // will be corrected when shelf is connected to a right end node
				"leftAngleB": 45, // will be corrected when shelf is connected to a right end node
				"rightAngleA": nextAngle,
				"rightAngleB": prevAngle
			};

			var shelf = new Shelf(this.params, null);

			shelf.setParent(this.transformNode);
			shelf.rotateZ(currentAngle);

			currentAngle += nextAngle % 360;
			this.shelves.push(shelf);
		}
		this.scene.render;

	}
};

/**********************************************************
ShelfUnit
**********************************************************/
class ShelfUnit {
	shelfNodes = [];
	shelves = [];
	shelfStyle;
	transformNode = null;
	scene;

	constructor(scene, shelfWidth, shelfHeight) {
		this.scene = scene;
		this.transformNode = new BABYLON.TransformNode("ShelfUnit", scene);
		this.transformNode.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
		this.transformNode.position.x = -shelfWidth / 20;

		this.shelfStyle = new ShelfStyle();
		this.shelfWidth = shelfWidth;
		this.shelfHeight = shelfHeight;

	}

	createShelfBottom() {
		var xPosition = 0;
		var shelfSpacing = this.shelfWidth / 5;

		var shelfNode = new ShelfNode(this.scene, this.transformNode, NodeType.BottomLeft, this.shelfStyle);
		shelfNode.populateNode();
		this.shelfNodes.push(shelfNode);
		xPosition += shelfSpacing;

		while (xPosition < this.shelfWidth) {
			var shelfNode = new ShelfNode(this.scene, this.transformNode, NodeType.Bottom, this.shelfStyle);
			shelfNode.populateNode();
			shelfNode.transformNode.position.x = xPosition;
			this.shelfNodes.push(shelfNode);
			xPosition += shelfSpacing;
		}

		var shelfNode = new ShelfNode(this.scene, this.transformNode, NodeType.BottomRight, this.shelfStyle);
		shelfNode.populateNode();
		shelfNode.transformNode.position.x = xPosition;
		this.shelfNodes.push(shelfNode);

	}
};

/**********************************************************
createScene
**********************************************************/
var createScene = function() {
	// This creates a basic Babylon Scene object (non-mesh)
	var scene = new BABYLON.Scene(engine);

	var camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 0, new BABYLON.Vector3(0, 0, -0), scene);
	// This targets the camera to scene origin
	//camera.setTarget(BABYLON.Vector3.Zero());

	camera.setPosition(new BABYLON.Vector3(0, 0, -25));
	camera.attachControl(canvas, true);

	var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(2, 1, -2), scene);
	light.intensity = 0.8;


	var light2 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(-3, -3, 3), scene);
	light2.intensity = 0.7;

	var pl = new BABYLON.PointLight("pl", BABYLON.Vector3.Zero(), scene);
	pl.diffuse = new BABYLON.Color3(1, 1, 1);
	pl.specular = new BABYLON.Color3(1, 1, 1);
	pl.intensity = 0.8;

	var shelfUnit = new ShelfUnit(scene, 100, 72);
	shelfUnit.createShelfBottom();

	var renderLoop = function() {
		scene.render();
	};
	engine.runRenderLoop(renderLoop);

	return scene;
};

