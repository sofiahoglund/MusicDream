		<script id="fragmentShaderNoise" type="x-shader/x-fragment">


			uniform float time;
			varying vec2 vUv;

			vec4 permute( vec4 x ) {

				return mod( ( ( x * 34.0 ) + 1.0 ) * x, 289.0 );

			}

			vec4 taylorInvSqrt( vec4 r ) {

				return 1.79284291400159 - 0.85373472095314 * r;

			}

			float snoise( vec3 v ) {

				const vec2 C = vec2( 1.0 / 6.0, 1.0 / 3.0 );
				const vec4 D = vec4( 0.0, 0.5, 1.0, 2.0 );

				// First corner

				vec3 i  = floor( v + dot( v, C.yyy ) );
				vec3 x0 = v - i + dot( i, C.xxx );

				// Other corners

				vec3 g = step( x0.yzx, x0.xyz );
				vec3 l = 1.0 - g;
				vec3 i1 = min( g.xyz, l.zxy );
				vec3 i2 = max( g.xyz, l.zxy );

				vec3 x1 = x0 - i1 + 1.0 * C.xxx;
				vec3 x2 = x0 - i2 + 2.0 * C.xxx;
				vec3 x3 = x0 - 1. + 3.0 * C.xxx;

				// Permutations

				i = mod( i, 289.0 );
				vec4 p = permute( permute( permute(
						 i.z + vec4( 0.0, i1.z, i2.z, 1.0 ) )
					   + i.y + vec4( 0.0, i1.y, i2.y, 1.0 ) )
					   + i.x + vec4( 0.0, i1.x, i2.x, 1.0 ) );

				// Gradients
				// ( N*N points uniformly over a square, mapped onto an octahedron.)

				float n_ = 1.0 / 7.0; // N=7

				vec3 ns = n_ * D.wyz - D.xzx;

				vec4 j = p - 49.0 * floor( p * ns.z *ns.z );  //  mod(p,N*N)

				vec4 x_ = floor( j * ns.z );
				vec4 y_ = floor( j - 7.0 * x_ );    // mod(j,N)

				vec4 x = x_ *ns.x + ns.yyyy;
				vec4 y = y_ *ns.x + ns.yyyy;
				vec4 h = 1.0 - abs( x ) - abs( y );

				vec4 b0 = vec4( x.xy, y.xy );
				vec4 b1 = vec4( x.zw, y.zw );


				vec4 s0 = floor( b0 ) * 2.0 + 1.0;
				vec4 s1 = floor( b1 ) * 2.0 + 1.0;
				vec4 sh = -step( h, vec4( 0.0 ) );

				vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
				vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

				vec3 p0 = vec3( a0.xy, h.x );
				vec3 p1 = vec3( a0.zw, h.y );
				vec3 p2 = vec3( a1.xy, h.z );
				vec3 p3 = vec3( a1.zw, h.w );

				// Normalise gradients

				vec4 norm = taylorInvSqrt( vec4( dot( p0, p0 ), dot( p1, p1 ), dot( p2, p2 ), dot( p3, p3 ) ) );
				p0 *= norm.x;
				p1 *= norm.y;
				p2 *= norm.z;
				p3 *= norm.w;

				// Mix final noise value

				vec4 m = max( 0.6 - vec4( dot( x0, x0 ), dot( x1, x1 ), dot( x2, x2 ), dot( x3, x3 ) ), 0.0 );
				m = m * m;
				return 42.0 * dot( m*m, vec4( dot( p0, x0 ), dot( p1, x1 ),
											  dot( p2, x2 ), dot( p3, x3 ) ) );

			}

			float surface3( vec3 coord ) {

				float n = 0.0;

				n += 1.0 * abs( snoise( coord ) );
				n += 0.5 * abs( snoise( coord * 2.0 ) );
				n += 0.25 * abs( snoise( coord * 4.0 ) );
				n += 0.125 * abs( snoise( coord * 8.0 ) );

				return n;

			}

			void main( void ) {

				vec3 coord = vec3( vUv, -time );
				float n = surface3( coord );

				gl_FragColor = vec4( vec3( n, n, n ), 1.0 );

			}

		</script>

		<script id="vertexShader" type="x-shader/x-vertex">

			varying vec2 vUv;
			uniform vec2 scale;
			uniform vec2 offset;

			void main( void ) {

				vUv = uv * scale + offset;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			}

		</script>

		<script>

			if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

			var SCREEN_WIDTH = window.innerWidth;
			var SCREEN_HEIGHT = window.innerHeight;

			var renderer, container, stats;

			var camera, scene;
			var cameraOrtho, sceneRenderTarget;

			var uniformsNoise, uniformsNormal,
				heightMap, normalMap,
				quadTarget;

			var directionalLight, pointLight;

			var terrain;

			var textureCounter = 0;

			var animDelta = 0, animDeltaDir = -1;
			var lightVal = 0, lightDir = 1;

			var clock = new THREE.Clock();

			var morph, morphs = [];

			var updateNoise = true;

			var animateTerrain = false;

			var textMesh1;

			var mlib = {};

			init();
			animate();

			function init() {

				container = document.getElementById( 'container' );

				// SCENE (RENDER TARGET)

				sceneRenderTarget = new THREE.Scene();

				cameraOrtho = new THREE.OrthographicCamera( SCREEN_WIDTH / - 2, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT / - 2, -10000, 10000 );
				cameraOrtho.position.z = 100;

				sceneRenderTarget.add( cameraOrtho );

				// CAMERA

				camera = new THREE.PerspectiveCamera( 40, SCREEN_WIDTH / SCREEN_HEIGHT, 2, 4000 );
				camera.position.set( -1200, 800, 1200 );

				controls = new THREE.OrbitControls( camera );
				controls.target.set( 0, 0, 0 );

				controls.rotateSpeed = 1.0;
				controls.zoomSpeed = 1.2;
				controls.panSpeed = 0.8;

				controls.keys = [ 65, 83, 68 ];

				// SCENE (FINAL)

				scene = new THREE.Scene();
				scene.fog = new THREE.Fog( 0x050505, 2000, 4000 );

				// LIGHTS

				scene.add( new THREE.AmbientLight( 0x111111 ) );

				directionalLight = new THREE.DirectionalLight( 0xffffff, 1.15 );
				directionalLight.position.set( 500, 2000, 0 );
				scene.add( directionalLight );

				pointLight = new THREE.PointLight( 0xff4400, 1.5 );
				pointLight.position.set( 0, 0, 0 );
				scene.add( pointLight );


				// HEIGHT + NORMAL MAPS

				var normalShader = THREE.NormalMapShader;

				var rx = 256, ry = 256;
				var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

				heightMap  = new THREE.WebGLRenderTarget( rx, ry, pars );
				heightMap.texture.generateMipmaps = false;

				normalMap = new THREE.WebGLRenderTarget( rx, ry, pars );
				normalMap.texture.generateMipmaps = false;

				uniformsNoise = {

					time:   { type: "f", value: 1.0 },
					scale:  { type: "v2", value: new THREE.Vector2( 1.5, 1.5 ) },
					offset: { type: "v2", value: new THREE.Vector2( 0, 0 ) }

				};

				uniformsNormal = THREE.UniformsUtils.clone( normalShader.uniforms );

				uniformsNormal.height.value = 0.05;
				uniformsNormal.resolution.value.set( rx, ry );
				uniformsNormal.heightMap.value = heightMap;

				var vertexShader = document.getElementById( 'vertexShader' ).textContent;

				// TEXTURES

				var textureLoader = new THREE.TextureLoader();

				var specularMap = new THREE.WebGLRenderTarget( 2048, 2048, pars );
				specularMap.texture.generateMipmaps = false;

				var diffuseTexture1 = textureLoader.load( "textures/terrain/grasslight-big.jpg", function () {

					loadTextures();
					applyShader( THREE.LuminosityShader, diffuseTexture1, specularMap );

				} );

				var diffuseTexture2 = textureLoader.load( "textures/terrain/backgrounddetailed6.jpg", loadTextures );
				var detailTexture = textureLoader.load( "textures/terrain/grasslight-big-nm.jpg", loadTextures );

				diffuseTexture1.wrapS = diffuseTexture1.wrapT = THREE.RepeatWrapping;
				diffuseTexture2.wrapS = diffuseTexture2.wrapT = THREE.RepeatWrapping;
				detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping;
				specularMap.texture.wrapS = specularMap.texture.wrapT = THREE.RepeatWrapping;

				// TERRAIN SHADER

				var terrainShader = THREE.ShaderTerrain[ "terrain" ];

				uniformsTerrain = THREE.UniformsUtils.clone( terrainShader.uniforms );

				uniformsTerrain[ "tNormal" ].value = normalMap;
				uniformsTerrain[ "uNormalScale" ].value = 3.5;

				uniformsTerrain[ "tDisplacement" ].value = heightMap;

				uniformsTerrain[ "tDiffuse1" ].value = diffuseTexture1;
				uniformsTerrain[ "tDiffuse2" ].value = diffuseTexture2;
				uniformsTerrain[ "tSpecular" ].value = specularMap;
				uniformsTerrain[ "tDetail" ].value = detailTexture;

				uniformsTerrain[ "enableDiffuse1" ].value = true;
				uniformsTerrain[ "enableDiffuse2" ].value = true;
				uniformsTerrain[ "enableSpecular" ].value = true;

				uniformsTerrain[ "diffuse" ].value.setHex( 0xffffff );
				uniformsTerrain[ "specular" ].value.setHex( 0xffffff );

				uniformsTerrain[ "shininess" ].value = 30;

				uniformsTerrain[ "uDisplacementScale" ].value = 375;

				uniformsTerrain[ "uRepeatOverlay" ].value.set( 6, 6 );

				var params = [
					[ 'heightmap', 	document.getElementById( 'fragmentShaderNoise' ).textContent, 	vertexShader, uniformsNoise, false ],
					[ 'normal', 	normalShader.fragmentShader,  normalShader.vertexShader, uniformsNormal, false ],
					[ 'terrain', 	terrainShader.fragmentShader, terrainShader.vertexShader, uniformsTerrain, true ]
				 ];

				for( var i = 0; i < params.length; i ++ ) {

					material = new THREE.ShaderMaterial( {

						uniforms: 		params[ i ][ 3 ],
						vertexShader: 	params[ i ][ 2 ],
						fragmentShader: params[ i ][ 1 ],
						lights: 		params[ i ][ 4 ],
						fog: 			true
						} );

					mlib[ params[ i ][ 0 ] ] = material;

				}


				var plane = new THREE.PlaneBufferGeometry( SCREEN_WIDTH, SCREEN_HEIGHT );

				quadTarget = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
				quadTarget.position.z = -500;
				sceneRenderTarget.add( quadTarget );

				// TERRAIN MESH

				var geometryTerrain = new THREE.PlaneBufferGeometry( 6000, 6000, 256, 256 );

				THREE.BufferGeometryUtils.computeTangents( geometryTerrain );

				terrain = new THREE.Mesh( geometryTerrain, mlib[ "terrain" ] );
				terrain.position.set( 0, -125, 0 );
				terrain.rotation.x = -Math.PI / 2;
				terrain.visible = false;
				scene.add( terrain );

				// RENDERER

				renderer = new THREE.WebGLRenderer();
				renderer.setClearColor( scene.fog.color );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
				container.appendChild( renderer.domElement );

				//

				renderer.gammaInput = true;
				renderer.gammaOutput = true;


				// STATS

				stats = new Stats();
				container.appendChild( stats.domElement );

				// EVENTS

				onWindowResize();

				window.addEventListener( 'resize', onWindowResize, false );

				document.addEventListener( 'keydown', onKeyDown, false );

				// COMPOSER

				renderer.autoClear = false;

				renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };

				renderTarget = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );
				renderTarget.texture.generateMipmaps = false;

				effectBloom = new THREE.BloomPass( 0.6 );
				var effectBleach = new THREE.ShaderPass( THREE.BleachBypassShader );

				hblur = new THREE.ShaderPass( THREE.HorizontalTiltShiftShader );
				vblur = new THREE.ShaderPass( THREE.VerticalTiltShiftShader );

				var bluriness = 6;

				hblur.uniforms[ 'h' ].value = bluriness / SCREEN_WIDTH;
				vblur.uniforms[ 'v' ].value = bluriness / SCREEN_HEIGHT;

				hblur.uniforms[ 'r' ].value = vblur.uniforms[ 'r' ].value = 0.5;

				effectBleach.uniforms[ 'opacity' ].value = 0.65;

				composer = new THREE.EffectComposer( renderer, renderTarget );

				var renderModel = new THREE.RenderPass( scene, camera );

				vblur.renderToScreen = true;

				composer = new THREE.EffectComposer( renderer, renderTarget );

				composer.addPass( renderModel );

				composer.addPass( effectBloom );
				//composer.addPass( effectBleach );

				composer.addPass( hblur );
				composer.addPass( vblur );

				// MORPHS

				function addMorph( geometry, speed, duration, x, y, z ) {

					var material = new THREE.MeshLambertMaterial( { color: 0xffaa55, morphTargets: true, vertexColors: THREE.FaceColors } );

					var mesh = new THREE.Mesh( geometry, material );
					mesh.speed = speed;

					var mixer = new THREE.AnimationMixer( mesh );
					mixer.clipAction( geometry.animations[ 0 ] ).setDuration( duration ).play();
					mixer.update( 600 * Math.random() );
					mesh.mixer = mixer;

					mesh.position.set( x, y, z );
					mesh.rotation.y = Math.PI/2;

					mesh.castShadow = true;
					mesh.receiveShadow = false;

					scene.add( mesh );

					morphs.push( mesh );

				}

				var loader = new THREE.JSONLoader();

				var startX = -3000;

				loader.load( "models/animated/parrot.js", function( geometry ) {

					addMorph( geometry, 250, 0.5, startX -500, 500, 700 );
					addMorph( geometry, 250, 0.5, startX - Math.random() * 500, 500, -200 );
					addMorph( geometry, 250, 0.5, startX - Math.random() * 500, 500, 200 );
					addMorph( geometry, 250, 0.5, startX - Math.random() * 500, 500, 1000 );

				} );

				loader.load( "models/animated/flamingo.js", function( geometry ) {

					addMorph( geometry, 500, 1, startX - Math.random() * 500, 350, 40 );

				} );

				loader.load( "models/animated/stork.js", function( geometry ) {

					addMorph( geometry, 350, 1, startX - Math.random() * 500, 350, 340 );

				} );

			}

			//

			function onWindowResize( event ) {

				SCREEN_WIDTH = window.innerWidth;
				SCREEN_HEIGHT = window.innerHeight;

				renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

				camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
				camera.updateProjectionMatrix();

			}

			//

			function onKeyDown ( event ) {

				switch( event.keyCode ) {

					case 78: /*N*/  lightDir *= -1; break;
					case 77: /*M*/  animDeltaDir *= -1; break;

				}

			}

			//

			function applyShader( shader, texture, target ) {

				var shaderMaterial = new THREE.ShaderMaterial( {

					fragmentShader: shader.fragmentShader,
					vertexShader: shader.vertexShader,
					uniforms: THREE.UniformsUtils.clone( shader.uniforms )

				} );

				shaderMaterial.uniforms[ "tDiffuse" ].value = texture;

				var sceneTmp = new THREE.Scene();

				var meshTmp = new THREE.Mesh( new THREE.PlaneBufferGeometry( SCREEN_WIDTH, SCREEN_HEIGHT ), shaderMaterial );
				meshTmp.position.z = -500;

				sceneTmp.add( meshTmp );

				renderer.render( sceneTmp, cameraOrtho, target, true );

			}

			//

			function loadTextures() {

				textureCounter += 1;

				if ( textureCounter == 3 )	{

					terrain.visible = true;

				}

			}

			//

			function animate() {

				requestAnimationFrame( animate );

				render();
				stats.update();

			}

			function render() {

				var delta = clock.getDelta();

				if ( terrain.visible ) {

					controls.update();

					var time = Date.now() * 0.001;

					var fLow = 0.1, fHigh = 0.8;

					lightVal = THREE.Math.clamp( lightVal + 0.5 * delta * lightDir, fLow, fHigh );

					var valNorm = ( lightVal - fLow ) / ( fHigh - fLow );

					scene.fog.color.setHSL( 0.1, 0.5, lightVal );

					renderer.setClearColor( scene.fog.color );

					directionalLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.1, 1.15 );
					pointLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.9, 1.5 );

					uniformsTerrain[ "uNormalScale" ].value = THREE.Math.mapLinear( valNorm, 0, 1, 0.6, 3.5 );

					if ( updateNoise ) {

						animDelta = THREE.Math.clamp( animDelta + 0.00075 * animDeltaDir, 0, 0.05 );
						uniformsNoise[ "time" ].value += delta * animDelta;

						uniformsNoise[ "offset" ].value.x += delta * 0.05;

						uniformsTerrain[ "uOffset" ].value.x = 4 * uniformsNoise[ "offset" ].value.x;

						quadTarget.material = mlib[ "heightmap" ];
						renderer.render( sceneRenderTarget, cameraOrtho, heightMap, true );

						quadTarget.material = mlib[ "normal" ];
						renderer.render( sceneRenderTarget, cameraOrtho, normalMap, true );

						//updateNoise = false;

					}


					for ( var i = 0; i < morphs.length; i ++ ) {

						morph = morphs[ i ];

						morph.mixer.update( delta );

						morph.position.x += morph.speed * delta;

						if ( morph.position.x  > 2000 )  {

							morph.position.x = -1500 - Math.random() * 500;

						}


					}

					//renderer.render( scene, camera );
					composer.render( 0.1 );

				}

			}

		</script>