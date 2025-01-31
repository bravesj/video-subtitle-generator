function createHydrogenAnimation() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth * 0.5 / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        precision: 'highp',
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio * 2.5);  
    renderer.setSize(window.innerWidth * 0.5, window.innerHeight);
    document.getElementById('background-animation').appendChild(renderer.domElement);

    // 增加粒子数量
    const particlesCount = 300000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);

    // 实现广义拉盖尔多项式
    function genlaguerre(n, alpha, x) {
        if (n === 0) return 1;
        if (n === 1) return 1 + alpha - x;
        
        let l0 = 1;
        let l1 = 1 + alpha - x;
        
        for (let i = 1; i < n; i++) {
            const ln = ((2*i + 1 + alpha - x) * l1 - (i + alpha) * l0) / (i + 1);
            l0 = l1;
            l1 = ln;
        }
        return l1;
    }

    // 实现球谐函数
    function sphericalHarmonic(m, l, phi, theta) {
        // 计算关联勒让德多项式
        function Plm(l, m, x) {
            if (l === 3 && m === 3) {
                return -15 * Math.pow(1 - x*x, 1.5);
            }
            return 0;
        }

        const x = Math.cos(theta);
        const norm = Math.sqrt((2*l + 1) * factorial(l-Math.abs(m)) / 
                             (4*Math.PI * factorial(l+Math.abs(m))));
        
        const phase = Math.cos(m*phi) + Math.sin(m*phi);
        return norm * Plm(l, m, x) * phase;
    }

    function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    // 实现氢原子波函数 (4,3,3)态
    function hydrogenWavefunction(r, theta, phi) {
        const n = 4, l = 3, m = 3;
        const a0 = 1;  // 波尔半径
        const rho = 2 * r / (n * a0);
        
        const laguerre = genlaguerre(n - l - 1, 2 * l + 1, rho);
        const radialPart = Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre;
        const angularPart = sphericalHarmonic(m, l, phi, theta);
        
        return radialPart * angularPart;
    }

    // 使用更丰富的颜色渐变
    function getColorGradient(probability) {
        // 定义完整光谱的颜色梯度点
        const gradientPoints = [
            { pos: 0.0, color: new THREE.Color(0.7, 0, 1) },    // 紫色 - 最低概率
            { pos: 0.15, color: new THREE.Color(0, 0, 1) },     // 蓝色
            { pos: 0.3, color: new THREE.Color(0, 1, 1) },      // 青色
            { pos: 0.45, color: new THREE.Color(0, 1, 0) },     // 绿色
            { pos: 0.6, color: new THREE.Color(1, 1, 0) },      // 黄色
            { pos: 0.75, color: new THREE.Color(1, 0.5, 0) },   // 橙色
            { pos: 1.0, color: new THREE.Color(1, 0, 0) }       // 红色 - 最高概率
        ];

        // 使用更精确的概率映射
        let normalizedProb = probability / maxProbability;
        
        // 使用幂函数映射来优化颜色分布
        normalizedProb = Math.pow(normalizedProb, 0.7);

        // 找到对应的颜色区间
        let startPoint = gradientPoints[0];
        let endPoint = gradientPoints[1];
        
        for (let i = 1; i < gradientPoints.length; i++) {
            if (normalizedProb <= gradientPoints[i].pos) {
                startPoint = gradientPoints[i-1];
                endPoint = gradientPoints[i];
                break;
            }
        }

        // 计算在当前区间内的插值
        const t = (normalizedProb - startPoint.pos) / (endPoint.pos - startPoint.pos);
        
        // 创建最终颜色
        const finalColor = new THREE.Color();
        finalColor.copy(startPoint.color).lerp(endPoint.color, t);

        return finalColor;
    }

    const probabilities = [];
    let maxProbability = 0;
    let minProbability = Infinity;

    // 第一遍：计算所有概率值和最大概率
    for(let i = 0; i < particlesCount; i++) {
        const r = 20 * Math.pow(Math.random(), 1/3);
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();
        
        const psi = hydrogenWavefunction(r, theta, phi);
        const probability = Math.abs(psi * psi);
        probabilities.push(probability);
        maxProbability = Math.max(maxProbability, probability);
        minProbability = Math.min(minProbability, probability);
    }

    // 显示前30%的点
    const sortedProbs = [...probabilities].sort((a, b) => b - a);
    const thresholdIndex = Math.floor(particlesCount * 0.3);
    const probabilityThreshold = sortedProbs[thresholdIndex];

    // 第二遍：生成粒子
    let validParticleCount = 0;
    for(let i = 0; i < particlesCount && validParticleCount < particlesCount * 0.3; i++) {
        const r = 20 * Math.pow(Math.random(), 1/3);
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = 2 * Math.PI * Math.random();

        const psi = hydrogenWavefunction(r, theta, phi);
        const probability = Math.abs(psi * psi);

        if (probability < probabilityThreshold) continue;

        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);

        const index = validParticleCount * 3;
        positions[index] = x;
        positions[index + 1] = y;
        positions[index + 2] = z;

        const color = getColorGradient(probability);
        colors[index] = color.r;
        colors[index + 1] = color.g;
        colors[index + 2] = color.b;

        // 调整粒子大小
        const normalizedProb = (probability - minProbability) / (maxProbability - minProbability);
        // 使用更小的基础大小和更小的变化范围
        sizes[validParticleCount] = 0.35 + normalizedProb * 0.3;

        validParticleCount++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: window.devicePixelRatio * 2.5 }
        },
        vertexShader: `
            uniform float time;
            uniform float pixelRatio;
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vSize;
            varying vec3 vPosition;
            varying vec4 vViewPosition;
            
            void main() {
                vColor = color;
                vSize = size;
                vPosition = position;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = mvPosition;
                gl_Position = projectionMatrix * mvPosition;
                // 更精细的渲染大小
                gl_PointSize = size * (150.0 / -mvPosition.z) * pixelRatio;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vSize;
            varying vec3 vPosition;
            varying vec4 vViewPosition;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                // 更小的截断半径
                if (dist > 0.3) discard;
                
                // 创建更精细的水晶效果
                float distanceFromCenter = length(vPosition) / 20.0;
                float viewDistance = -vViewPosition.z / 30.0;
                float crystalEffect = pow(1.0 - dist * 2.0, 4.0);
                
                // 更精细的透明度控制
                float alpha = smoothstep(0.3, 0.0, dist);
                alpha *= 0.12 * (1.0 - viewDistance * 0.5);  
                
                // 添加更细腻的晶莹效果
                vec3 finalColor = vColor;
                
                // 添加基于视距的光泽
                float specular = pow(1.0 - dist, 5.0) * (1.0 - viewDistance) * 0.15;
                finalColor += vec3(specular);
                
                // 添加水晶般的折射效果
                float refraction = pow(dist, 2.0) * crystalEffect * 0.08;
                finalColor += vColor * refraction;
                
                // 更细腻的边缘泛光
                float edgeGlow = pow(dist / 0.3, 5.0) * 0.06;
                finalColor += vec3(edgeGlow);
                
                // 确保颜色不会过饱和
                finalColor = clamp(finalColor, 0.0, 1.0);
                
                gl_FragColor = vec4(finalColor, alpha * (1.0 - edgeGlow * 0.2));
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MaxEquation,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        depthTest: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 30;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.5; 

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        particles.rotation.y += 0.0003;  
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth * 0.5 / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth * 0.5, window.innerHeight);
        material.uniforms.pixelRatio.value = window.devicePixelRatio * 2.5;
    });
}

window.createHydrogenAnimation = createHydrogenAnimation;
