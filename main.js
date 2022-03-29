

function Window(canvasId, width, height){
	var self = this;
	self.canvas = document.getElementById(canvasId);
	self.context = self.canvas.getContext("2d");
	self.context.globalAlpha = 1;
	self.id = canvasId;
	if (width == null){
		self.width = self.canvas.parentElement.offsetWidth;
	}
	if (height == null){
		self.height = self.canvas.parentElement.offsetHeight;
	}
	self.canvas.width = self.width;
	self.canvas.height = self.height;
	self.context.translate(Math.floor(self.width/2), Math.floor(self.height/2));

	return self;
}



function Shape(center, vertices, edges){
	var self = this;

	self.center = center;
	self.vertices = vertices;
	self.edges = edges;

	self.transformed = [];
}


function GameEngine(params){
	var self = this;

	// Configurations 

	self.mainWindow = new Window(params.mainWindow.canvasId);

	self.subWindows = [];
	for (let i in params.subWindows){
		let subWindow = params.subWindows[i];
		self.subWindows.push(new Window(subWindow.canvasId, subWindow.width, subWindow.height));
	}

	self.fov = Math.PI/2;

	self.screenZ = (self.mainWindow.height/2) / (Math.tan(self.fov/2));
	self.clipZ = 10000;

	self.mainWindow.context.lineWidth = 1;
	self.mainWindow.context.strokeStyle = "white";
	
	self.mouse = [0, 0];

	self.mainWindow.canvas.addEventListener("mousemove", function(event){
		event.preventDefault();
		self.mouse[0] = event.x - self.mainWindow.width/2;
		self.mouse[1] = event.y - self.mainWindow.height/2;
	});


	self.keydownEvents = {};
	self.keyupEvents = {};

	document.addEventListener("keydown", function(event){
		event.preventDefault();
		self.keydownEvents[event.key] = true;
	});

	document.addEventListener("keyup", function(event){
		event.preventDefault();
		self.keyupEvents[event.key] = true;
	});


	// Methods

	self.init = function(){

	};


	self.draw = function(timestamp){
		// main game logic here...
	};

	self.clearKeyEvents = function(){
		self.keydownEvents = {};
		self.keyupEvents = {};
	};


	self.matrixMult = function(A, B){
		var product = [];
		var sum;
		for (var i = 0; i < A.length; i++){
			product[i] = [];
			for (var j = 0; j < B[i].length; j++){
				sum = 0;
				for (var k = 0; k < A[i].length; k++){
					if (A[i][k] == Infinity || A[i][k] == -Infinity || B[k][j] == Infinity || B[k][j] == -Infinity){
						var l = 0;
						if (A[i][k] > 0){
							l += 1;
						}
						else if (A[i][k] < 0){
							l -= 1;
						}
						else {
							continue;
						}
						if (B[k][j] > 0){
							l += 1;
						}
						else if (B[k][j] < 0){
							l -= 1;
						}
						else {
							continue;
						}
						if (l == 0){
							sum = -Infinity;
							break;
						}
						else {
							sum = Infinity;
							break;
						}
					}
					else {
						sum += A[i][k] * B[k][j];
					}
					
				}
				product[i].push(sum);
			}
		}
		return product;
	};

	self.matrixScale = function(A, s){
		for (var i = 0; i < A.length; i++){
			for (var j = 0; j < A[i].length; j++){
				A[i][j] = s * A[i][j];
			}
		}
		return A;
	};

	self.rotateX = function(angle){
		return [
			[1, 0, 0, 0],
			[0, Math.cos(angle), -Math.sin(angle), 0],
			[0, Math.sin(angle), Math.cos(angle), 0],
			[0, 0, 0, 1]
		];
	};

	self.rotateY = function(angle){
		return [
			[Math.cos(angle), 0, Math.sin(angle), 0],
			[0, 1, 0, 0],
			[-Math.sin(angle), 0, Math.cos(angle), 0],
			[0, 0, 0, 1]
		];
	};

	self.rotateZ = function(angle){
		return [
			[Math.cos(angle), -Math.sin(angle), 0, 0],
			[Math.sin(angle), Math.cos(angle), 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];
	};


	self.project = function(screenZ, clipZ, z){
		if (z == Infinity){
			z = clipZ;
		}
		else if (z == -Infinity){
			z = screenZ;
		}
		return [
			[screenZ/z, 0, 0, 0],
			[0, screenZ/z, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];
	};

	self.translate = function(tx, ty, tz){
		return [
			[1, 0, 0, tx],
			[0, 1, 0, ty],
			[0, 0, 1, tz],
			[0, 0, 0, 1]
		];
	};


	self.identityMatrix = function(){
		return [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];
	};

	self.renderShape = function(windowObj, shapeObj, transformation){
		if (transformation == null){
			transformation = self.identityMatrix();
		}
		var translateMat = self.translate(shapeObj.center[0], shapeObj.center[1], shapeObj.center[2]);
		var tempTransformation = self.matrixMult(translateMat, transformation);
		for (var i = 0; i < shapeObj.vertices.length; i++){
			shapeObj.transformed[i] = self.matrixMult(tempTransformation, shapeObj.vertices[i]);
			shapeObj.transformed[i] = self.matrixMult(self.project(self.screenZ, self.clipZ, shapeObj.transformed[i][2]), shapeObj.transformed[i]);
		}
		for (var i = 0; i < shapeObj.edges.length; i++){
			var start = shapeObj.transformed[shapeObj.edges[i][0]];
			var end = shapeObj.transformed[shapeObj.edges[i][1]];
			self.drawLine(windowObj, start, end);
		}
	};


	self.transformCenter = function(transformation, shapeObj){
		shapeObj.center = self.matrixMult(transformation, shapeObj.center);
	};


	self.drawLine = function(windowObj, start, end){
		start = start.slice();
		end = end.slice();
		var coordinates = [start, end];
		for (var i in coordinates){
			for (var j in coordinates[i]){
				if (coordinates[i][j][0] == Infinity){
					if (j == 0){

						coordinates[i][j] = [windowObj.width/2];
					}
					else if (j == 1){

						coordinates[i][j] = [windowObj.height/2];
					}
				}
				if (coordinates[i][j][0] == -Infinity){
					if (j == 0){
						coordinates[i][j] = [-windowObj.width/2];
					}
					else if (j == 1){
						coordinates[i][j] = [-windowObj.height/2];
					}
				}
			}
		}
		start = coordinates[0];
		end = coordinates[1];

		windowObj.context.moveTo(Math.floor(start[0]), Math.floor(start[1]));
		windowObj.context.lineTo(Math.floor(end[0]), Math.floor(end[1]));
	};


	self.clearWindow = function(windowObj){
		windowObj.context.clearRect(-Math.floor(windowObj.width/2), -Math.floor(windowObj.height/2), 
			Math.floor(windowObj.width), Math.floor(windowObj.height));
	};


	self.run = function(){
		self.init();
		self.update();
	}

	self.update = function(){
		window.requestAnimationFrame(self.draw);
	}


	return self;
}



function Tile(center, vertices, edges, type, main){
	var self = this;
	Shape.call(self, center, vertices, edges);

	self._center = center.slice();
	self._vertices = vertices.slice();
	self._edges = edges.slice();


	self.bounds = [
		[-main.mainWindow.width/2, main.mainWindow.width/2],
		[-main.mainWindow.height/2, main.mainWindow.height/2],
		[main.screenZ, main.clipZ]
	];

	self.type = type;

	self.reset = function(dir){

		if (dir[2] == -1 && self.type == "horizontal"){
			self.center = self._center.slice();
			self.vertices = self._vertices.slice();
			self.edges = self._edges.slice();
			self.center[2] = [self.bounds[2][1]];
		}
		else if (dir[2] == 1 && self.type == "horizontal"){
			self.center = self._center.slice();
			self.vertices = self._vertices.slice();
			self.edges = self._edges.slice();			
			self.center[2] = [self.bounds[2][0]];
		}
		if (dir[0] == -1 && self.type == "vertical"){
			self.center = self._center.slice();
			self.vertices = self._vertices.slice();
			self.edges = self._edges.slice();
			self.center[0] = [self.bounds[0][1]];
		}
		else if (dir[0] == 1 && self.type == "vertical"){
			self.center = self._center.slice();
			self.vertices = self._vertices.slice();
			self.edges = self._edges.slice();			
			self.center[0] = [self.bounds[0][0]];
		}
		
	};

	self.isOutside = function(){
		var outside = [0, 0, 0];
		if (self.center[2][0] < self.bounds[2][0] - 1){
			outside[2] = -1;
		}
		else if (self.center[2][0] > self.bounds[2][1] + 1){
			outside[2] = 1;
		}
		if (self.transformed[1][0] < self.bounds[0][0] - 1){
			outside[0] = -1;
		}
		else if (self.transformed[1][0] > self.bounds[0][1] + 1){
			outside[0] = 1;
		}
		if (self.center[1][0] < self.bounds[1][0] - 1){
			outside[1] = -1;
		}
		else if (self.center[1][0] > self.bounds[1][1] + 1){
			outside[1] = 1;
		}


		return outside;
	};


	return self;

};




function Main(params){
	var self = this;
	GameEngine.call(self, params); // extend GameEngine


	self.init = function(){
		self.shapes = [];
		self.generateFloor();
	};

	var centerTransformation;

	self.cameraDir = [0, 0, 0];
	self.cameraSpeed = 10;


	self.draw = function(timestamp){
		self.clearWindow(self.mainWindow);
		self.mainWindow.context.beginPath();

		self.mainWindow.context.arc(0, 0, 5, 0, 2*Math.PI, true);
		
		if (self.keydownEvents["w"]){
			self.cameraDir[2] = -1;
		}
		if (self.keydownEvents["s"]){
			self.cameraDir[2] = 1;
		}
		if (self.keydownEvents["a"]){
			self.cameraDir[0] = 1;
		}
		if (self.keydownEvents["d"]){
			self.cameraDir[0] = -1;
		}

		if (self.keyupEvents["w"] || self.keyupEvents["s"]){
			self.cameraDir[2] = 0;
		}
		if (self.keyupEvents["a"] || self.keyupEvents["d"]){
			self.cameraDir[0] = 0;
		}

		centerTransformation = self.translate(
				self.cameraDir[0] * self.cameraSpeed,
				0,
				self.cameraDir[2] * self.cameraSpeed
			);

		for (var i in self.shapes){
			self.transformCenter(centerTransformation, self.shapes[i]);
			self.renderShape(self.mainWindow, self.shapes[i]);
			var isOutside = self.shapes[i].isOutside();
			self.shapes[i].reset(isOutside);
		}

		self.mainWindow.context.stroke();
		self.clearKeyEvents();
		self.update();
	};


	self.getAngle = function(){
		var angleX, angleY, angleZ;




		return [angleX, angleY, angleZ];
	};
	

	self.generateFloor = function(){
		for (var z = self.screenZ; z < self.clipZ; z += 200){
			var vertices = [
				[[-Infinity], [0], [0], [1]],
				[[Infinity], [0], [0], [1]]
			];
			var edges = [[0, 1]];
			var center = [[0], [self.mainWindow.height/2], [z], [1]];
			var tile = new Tile(center, vertices, edges, "horizontal", self);
			self.shapes.push(tile);
		}

		var startX = -Math.tan(self.fov/2)*self.clipZ*(self.mainWindow.width/self.mainWindow.height);
		var endX = -startX;
		for (var x = startX; x < endX; x += 200){
			var vertices = [
				[[0], [0], [-Infinity], [1]],
				[[0], [0], [Infinity], [1]]
			];
			var edges = [[0, 1]];
			var center = [[x], [self.mainWindow.height/2], [0], [1]];

			var tile = new Tile(center, vertices, edges, "vertical", self);
			self.shapes.push(tile);
		}
	};

}


var main = new Main({
	mainWindow: {
		canvasId: "main-canvas"
	},
});


main.run();