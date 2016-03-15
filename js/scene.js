if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

			
			//variabler

			var camera, controls, scene, renderer;
			var sky, sunSphere, sphere;
			var distance = 400000;

			function initSky() {

				// Add Sky Mesh
				sky = new THREE.Sky();
				scene.add( sky.mesh);

				// Add sphere for sun
				sunSphere = new THREE.Mesh(
					new THREE.SphereBufferGeometry( 20000, 16, 8 ),
					new THREE.MeshBasicMaterial( { color: 0xffffff } )
					);

				// add sun to scene
				sunSphere.position.y = - 700000;
				scene.add( sunSphere );

				// change sunlight
				var uniforms = sky.uniforms;
				uniforms.turbidity.value = 10;
				uniforms.reileigh.value = 5;
				uniforms.luminance.value = 1;
				uniforms.mieCoefficient.value = 0.005;
				uniforms.mieDirectionalG.value = 0.8;
				var theta = Math.PI * ( 0.49 - 0.5 );
				var phi = 2 * Math.PI * ( 0.25 - 0.5 );

				//Set sphere position
				sunSphere.position.x = distance * Math.cos( phi );
				sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
				sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );
				sunSphere.visible = false;

				sky.uniforms.sunPosition.value.copy( sunSphere.position );
			}

			function init() {
				// Init the  scenen
				camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 10, 2000000 );
				camera.position.set( 0, 0, 130);
				scene = new THREE.Scene();
				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				document.body.appendChild( renderer.domElement );



				// Init the sky/background
				initSky();

				// Add Spotlight
	 			var light = new THREE.SpotLight(0xFFFFFF, 1, 1000); 
	 			light.position.copy(camera.position);
	 			scene.add(light);
	 			light.castShadow = true;
	 			light.shadowDarkness = 0.7;
	 			renderer.render( scene, camera );

				// Add Ambientlight
				var lightamb = new THREE.AmbientLight( 0xFFFFFF, 2, 1000 ); // soft white light
				scene.add( lightamb ); 

				// Add controls for navigation
				controls = new THREE.OrbitControls( camera, renderer.domElement );
				controls.addEventListener( 'change', render );
				controls.enableZoom = true;
				controls.enablePan = true;
				window.addEventListener( 'resize', onWindowResize, false );	
 			
 				}
 			


			// Controll window size when zooming
		    function onWindowResize() {
		    	camera.aspect = window.innerWidth / window.innerHeight;
		    	camera.updateProjectionMatrix();
		    	renderer.setSize( window.innerWidth, window.innerHeight );
		    	render();
		    }

		    // Render the scene
		    function render() {
		    	renderer.render( scene, camera );
		    }