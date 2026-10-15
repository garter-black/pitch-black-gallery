# Black Garter character repair, September 2026

## Captured movement and portrait revision

The player uses retargeted human motion capture for walking, jogging and running.
The data used in this project was obtained from [mocap.cs.cmu.edu](http://mocap.cs.cmu.edu/).
The database was created with funding from NSF EIA-0196217. CMU permits inclusion
in commercial products and modification; its data may not be resold directly,
including converted form. Selected trials are 35_01, 35_17 and 09_01, recorded at
120 Hz. An independently written exporter fits these to the adult skeleton,
filters noise, closes cycles and fits flat-floor stance. Fingers are authored
because the source does not capture them. This is a curated blend set, not a
complete motion-matching system or animation extracted from a commercial game.
Original traversal clips remain in use.

The seven outfits and exposed limb surfaces share a refined cross-sectional
fit around the existing joints; trainer cuffs follow the calf weights. The rest
rig, head geometry and body height remain intact. Five fresh photographic-style
portrait atlases depict twenty original fictional adults in contemporary
summer, casual and business clothing. Each portrait occupies 627 square pixels
within a 1254-square sheet. Generated source images are unchanged. Previous art
and accepted builds are preserved. These visual proportions do not represent
measured BMI, health standards or garment sizes.

The shared 3D heads and coarse hair still require further asset work to reach
finished photorealistic quality. This revision adds no cloth or strand simulation.

The current runtime gives each of the twenty adult characters individual facial
geometry, fitted brows and lashes, higher-detail eyes, a choice of four original
skin photographs, and eight hairstyle arrangements including Artemis's existing
ponytail. Seven contemporary wardrobe combinations replace the rendered armour
and high collars: tees, tanks, jeans, shorts, open-neck blouses, skirts and summer
dresses, with everyday trainers. Garment and texture assets are shared; each
character retains a private rig, face geometry, fitting and materials.

The facial overlays preserve semi-transparent brow and eyelash strands through
single-pass alpha blending. Brows are fitted outside each actual head surface;
the original face anatomy and skin photographs remain intact. Hecate now uses
the individually fitted longer hairstyle in a dark pigment, leaving both eyes
visible and moving her silhouette closer to her concept portrait. This is a
facial-detail repair, not completed photorealistic character production.

Eye colour now follows the two iris regions in the existing photographic atlas,
retaining their luminance detail while preserving the pupil and surrounding eye
whites. The source eye mesh's curved corneal triangles, previously discarded by
the atlas's transparent corner, supply a separate specular reflection surface.
This is an additive dielectric reflection approximation, not full refraction.
It partitions the existing 2,040 eye triangles into 1,060 colour-surface and 980
corneal triangles, reusing the vertex attributes and atlas. One additional draw
call and a private material are required per visible avatar; no new image or
transmission buffer is used. The original source geometry, portraits, skin maps,
wardrobe and movement clips remain intact.

The source remains the accepted CC0 adult foundation below. Additional facial
targets, high-poly eyes, brows, lashes, hair and everyday garments come from
[MakeHuman's official CC0 system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
and the [official target data](https://github.com/makehumancommunity/makehuman/tree/master/makehuman/data/targets).
Source PNG bytes are unchanged. The full CC0 asset archive was acquired privately
for this later repair; the earlier acquisition limit below describes the first
milestone only. Source meshes, builders, archive and review files are not served.

The twenty new contemporary portraits are original generated artwork. They are
character art direction, not photographs of real people or renders of the game
meshes. The game models have improved facial detail but are not photorealistic
AAA characters or captured Stellar Blade assets. Further sculpting, facial
animation and cloth/hair simulation remain possible. The slim adult base and
clothing proportions are visual styling, not a BMI or health recommendation.

## Original foundation record, retained for provenance

This is an actual skinned, textured 3D character built on a CC0 MakeHuman adult female foundation. Artemis has a fitted opaque undersuit, outer clothing, gloves, boots, a textured ponytail, eyes, a structured collar and an original diamond brooch. The Black Garter additions are the garment envelope and contour adjustments, costume composition, material palette, geometric detailing, native GLB exporter and idle animation.

This milestone is **not a bespoke AAA character or a claim of Stellar Blade production quality**. It is an improvement-ready rigged foundation. All twenty gods share this adult model; Artemis now also has original fitted silver equipment, a private wardrobe treatment, an original geometric hairstyle increment and differentiated surface finishes, while the other nineteen retain their palette and idle-phase variants. Their original concept portraits show design direction, not renders of this mesh. The final identities still need individual face and body production, further hair and costume refinement, richer material detail, and authored movement and facial animation.

## Adult basis and source data

The source is MakeHuman's `hm08` basemesh with `macrodetails/asian-female-young.target` applied at full weight. MakeHuman's current age mapping defines its young adult midpoint as **25 years**. This export uses that adult morph, normalized to a body height of 1.72 metres. Runtime display height may vary without changing the adult basis.

- Base, adult morph, default 163-bone skeleton, weights and low-poly eyes: [official MakeHuman repository](https://github.com/makehumancommunity/makehuman).
- Skin `young_asian_female`, hair `ponytail01`, and clothing `female_sportsuit01`: [official MakeHuman system assets, explicitly CC0](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
- Age mapping: [MakeHuman human.py](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/apps/human.py), `MID_AGE = 25` and the young-adult age calculation. No application code was copied into the exporter.
- Data-format basis: [official MakeHuman file format documentation](https://static.makehumancommunity.org/oldsite/documentation/file_formats_and_extensions.html).

The original sportsuit is a cropped tee and fitted trousers. The export adds an opaque fitted garment underneath it so the torso and limbs remain covered. No skin surface is rendered below the neck. Source body helper meshes are used for fitting and rig joint positions; they are not rendered. No source texture bitmap has been edited. The skin, hair, eyes and sportsuit normal PNGs are embedded byte-for-byte in the GLB, and their checksums are tested.

## Licensing

The selected MakeHuman data assets were expressly released under **Creative Commons CC0 1.0 Universal**. Their headers identify the release in September 2020 and the holders at that time as Data Collection AB, Joel Palmius and Jonas Hauquier. The rig and weight JSON files also identify CC0. Commercial use and adaptation of these data are covered by that release. See [MakeHuman's licensing explanation](https://static.makehumancommunity.org/about/license.html), the [official asset license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md), and the unchanged local [CC0 license](./CC0-LICENSE.txt).

MakeHuman's application software has separate licensing. This project uses selected CC0 data through an independently written parser/exporter; it neither embeds nor distributes MakeHuman application code. This distinction is also addressed by [MakeHuman's closed-source use FAQ](https://static.makehumancommunity.org/mpfb/faq/use_in_closed_source.html).

Three.js, GLTFLoader, BufferGeometryUtils and SkeletonUtils are exact unmodified files from npm `three@0.180.0`, covered by the existing [Three.js MIT license](../vendor/THREE-LICENSE.txt). The package's SHA-512 integrity and each addon file's SHA-256 are recorded in `SOURCE-RECEIPT.json`.

## Build and verification

`SOURCE-RECEIPT.json` records every selected source URL/archive member, byte count and SHA-256. Only selected members of the official asset pack were fetched using bounded HTTP Range requests with a fixed ETag. Total implementation acquisition was **19,966,066 bytes**, below the 50,000,000-byte cap; the full asset pack was not downloaded. Re-running the acquisition script verifies the cached files without another download.

`build_character.py` exports glTF 2.0 directly using the installed Python/numpy/scipy environment. Bone positions are derived from the morphed source joint references. The rest rig uses world-aligned local axes and correct inverse bind matrices; this is a valid skinning rig, without a BVH retargeting claim. Garment influences use the source barycentric fit and normalized largest-four joint weights. This build needed no missing-weight fallback.

The model has 163 joints, 14 skinned parts, 20,624 vertices including UV seams, 35,460 triangles and one six-second idle clip. `verify_character.py` checks the GLB container, accessors, indices, UVs, normals, normalized weights, inverse binds, opaque clothing, adult metadata, looping animation and unchanged embedded texture bytes. `verify-runtime.mjs` uses the actual pinned Three.js loader, cloning and animation mixer to check twenty variants, shared geometry/textures, independent rigs/materials, finite skinning, a relaxed initial pose for reduced-motion mode, and the nearest-three animation budget. Node uses an image decoder stand-in for that test; scene screenshots and browser rendering remain the visual acceptance check.

The base hairstyle is a textured polygon mesh attached to the head. It has no strand simulation or secondary motion. Artemis's NPC receives the additional hairstyle treatment described below; the shared base GLB remains intact. The accepted base GLB contains its quiet idle only. A separate optional [original locomotion increment](./LOCOMOTION.md) now supplies walk, run, jump, landing and dash poses without modifying the accepted base. Combat choreography, the wider superpower transition set and facial performance remain production steps.

The root task reviewed revision two in the actual local browser on 10 September 2026. It confirmed defined boots with no visible toes, clean dark jacket panels and piping, a covered neck seam, and relaxed arms even with reduced motion enabled. That review accepted the concrete fitting improvements for this milestone; it did not rate this shared-base model as bespoke AAA art. No screenshot file is included in this character folder; the browser review evidence remains in the root task's tool/conversation history.

## Artemis equipment and wardrobe, revision three

Artemis alone has an original architectural hair pin and small diamond-cut ear drops, one asymmetric faceted shoulder plate, a slim forearm bracer, and a folded sculptural silver bow along her back. Her NPC wardrobe uses a silver-white jacket and high collar, dark inner seams and fitted lower-body coverage, fine ice-blue piping, and a black ponytail. The direction follows [the project's Artemis concept portrait](../art/portraits-a.png). The user's stylish science-fiction action reference is contextualized by [the official Stellar Blade design interview](https://blog.playstation.com/2024/04/08/stellar-blade-interview-creating-stylish-sci-fi-action-in-a-post-apocalyptic-world/); no models, textures, costumes or animation files from that game are used.

`artemis-equipment.js` constructs four texture-free equipment meshes with **1,448 triangles**, one shared equipment material and four additional main-pass draw calls. Head jewelry, shoulder plate, bracer and bow are attached respectively to the existing head, left upper-arm, right forearm and upper-spine bones in the accepted bind pose, before the idle mixer starts. Attachment preserves world transforms under the existing uniform avatar scale, following the [Three.js Object3D attachment contract](https://threejs.org/docs/pages/Object3D.html). The equipment follows those bones without an extra animation mixer or skeleton.

The accepted `artemis.glb`, optional `artemis-locomotion.glb`, source PNGs and original shared geometry buffers remain byte-for-byte unchanged. Artemis's runtime uses six privately owned garment geometry copies: the complete shirt retains its source weights, UVs and smooth normals, with 6–16 mm of physical clearance from the bind-pose undersuit envelope; the source outer trouser triangles are omitted to keep a clean dark lower body; fully covered central torso under-layer triangles are masked; and jacket panels, collar and piping receive small coordinated offsets. The opaque midriff, trousers, sleeve openings, hands and boots remain covered. This is a limited character-specific wardrobe fit, not a new retopologized body or texture edit.

The runtime omits 1,712 source outer-trouser triangles and 1,770 covered torso triangles for Artemis, while retaining the full 1,724-triangle outer shirt. Including the new equipment, her visible geometry totals **33,426 triangles across eighteen parts**. Other gods and the independent local-player factory retain their original geometry, materials and appearance; even a player named Artemis does not receive this NPC equipment. Owned garment copies, equipment meshes and materials are released idempotently without disposing shared source assets.

`verify-artemis-equipment.mjs` uses the actual pinned Three.js loader and mixer to verify immutable source hashes and five original PNGs, bind attachment transforms, finite bounded motion over 180 idle frames, face clearance, 54 outward shell-normal samples and two swept-bow normal samples, unchanged skin weights/UVs/smooth normals, preservation of all nineteen other god appearances and the local player, and exact-once cleanup. Its internal receipt is `ARTEMIS-EQUIPMENT-VERIFICATION.json`; scripts and receipts are not public runtime assets.

The root task inspected revision three in the actual studio from the front, side, back and close-up on 10 September 2026. It accepted the clean dark trousers, outward silver equipment, visible folded-bow silhouette, face-clear jewelry and reduced collar specks as a bounded wardrobe/equipment increment. Remaining collar and panel surface refinement, richer cloth/material detail, a distinct face and body, individual hair work and more sophisticated equipment deformation remain future art production. This acceptance does not claim zero clipping in every pose or a finished bespoke AAA character.

## Artemis hairstyle increment

Artemis's NPC now has a higher gathered black ponytail with nine layered, flattened locks, staggered tapered ends, two restrained strands beside the face, and shallow crown flow that fades into the retained scalp. The design follows the project's original Artemis portrait in the lower-left of `portraits-a.png`. The geometry is original project work. No new third-party asset, game model, game texture, purchased asset or edited bitmap is introduced.

`artemis-hair.js` adds one indexed mesh, one ordinary `MeshStandardMaterial`, **9,768 triangles**, and one main-pass draw call. It uses vertex colors and adds zero textures. The implementation uses [Three.js indexed geometry and vertex normals](https://threejs.org/docs/pages/BufferGeometry.html) with the existing pinned Three.js 0.180.0 runtime. Flattened sections follow continuous transported frames around the gathered root; the hairstyle follows the existing head bone without an additional skeleton, mixer or strand simulation.

A privately owned copy of the source hair index omits 3,708 triangles belonging to complete old low-tail components and 296 outer faces around its former lower tie. The source position, normal, UV and skinning attributes remain exact. A small original black closure is fitted over the measured upper-rear scalp opening revealed by that omission; it covers the opening without editing the face, body or texture. The original fitted scalp and its unchanged texture remain visible beneath the crown detail. New tail roots are measured against the retained source scalp, with their centres within 1.15 mm of that surface.

The net increase over the accepted equipment/wardrobe revision is **5,764 triangles**. Artemis now totals **39,190 visible triangles across nineteen parts**. The underlying adult GLB, locomotion GLB, equipment module, five original source PNGs and all five concept portrait atlases remain byte-for-byte unchanged. All nineteen other gods and the independent local player retain their previous appearance. The runtime applies this increment only to the exact Artemis NPC name, before its idle pose begins. Cleanup restores the original scalp geometry and releases only privately owned resources.

The private `verify-artemis-hair.mjs` suite uses the actual pinned Three.js loader and mixer. It checks the immutable files and buffers, exact NPC isolation, face and lower-ear-drop clearance, root attachment, 360 idle frames, 5,350 finite unit normals, 1,440 outward crown samples, 2,440 outward lock samples, all 208 closure normals, eighteen independently sampled source-skin points covered at the rear opening, tapered crown ends, and exact-once cleanup with zero shared-resource disposals. The current character has twelve owned geometry objects and eleven private materials including its wardrobe and equipment. Its internal receipt is `ARTEMIS-HAIR-VERIFICATION.json`; test scripts and receipts remain outside the public runtime allowlist. Node image decoding is a stand-in, so visual acceptance is separate from these geometry checks.

The root task accepted the final hairstyle in the actual private studio on 10 September 2026 after front, 45-degree, both side, rear and rear three-quarter close-ups, plus a full-body front view. The final review confirmed a continuous high-tail silhouette, blended crown detail, a closed rear scalp join, and clear central facial features and diamond drops. This is a bounded hairstyle increment on the shared adult foundation. Further face and body production, richer hair and cloth detail, more sophisticated hair motion, and full bespoke character quality remain production work; no universal clipping-free or finished AAA claim is made.

## Artemis surface increment

`artemis-surfaces.js` refines only the exact Artemis NPC after its existing equipment and hair have been attached. It adjusts color, roughness, metalness and the brooch's emission on eleven already-private `MeshStandardMaterial` objects. It allocates no material, texture, geometry, render pass or GPU resource. The accepted geometry remains **39,190 triangles across nineteen parts**, with the same twelve owned geometry objects and eleven private materials. Other gods and the independent local player, including a player named Artemis, retain their accepted release06 appearance.

The finish separates cool silver-white clothing, a matte graphite undersuit, smoother near-black boots and gloves, silver equipment and restrained ice-blue accents. Skin and eye albedo colors retain their source values. The authored roughness and metalness values are artistic approximations rather than measured material samples:

| Existing surface | Color treatment | Roughness | Metalness |
| --- | --- | ---: | ---: |
| Outer shirt | Cool gray `#c5cbd0` | 0.64 | 0 |
| Jacket panels and collar | Silver-white `#e1e4e2` | 0.41 | 0 |
| Undersuit | Deep graphite `#151e24` | 0.70 | 0 |
| Boots and gloves | Near-black `#151b21` | 0.27 | 0 |
| Articulated trim | Pale silver `#d4dee2` | 0.32 | 1 |
| Equipment | White factor over existing vertex colors | 0.47 | 1 |
| Original diamond brooch | Ice blue `#7fb5c9`, zero emission | 0.18 | 0 |
| Retained source hair cap | Obsidian `#2b3037` | 0.60 | 0 |
| Original geometric hair locks | Existing vertex-color treatment | 0.44 | 0 |
| Adult face and neck | Source color unchanged | 0.58 | 0 |
| Eyes | Source color unchanged | 0.10 | 0 |

The treatment follows the metallic/roughness distinction described by the [Three.js MeshStandardMaterial documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html) and [Khronos glTF 2.0 material specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#metallic-roughness-material): ordinary nonmetals use metalness zero, metals use one, and roughness controls reflection spread. Material colors modulate the existing texture and vertex colors. The source maps, map color spaces, normal-map scales and data, alpha and rendering flags, skinning, geometry buffers, shader callbacks and material identities are preserved.

The accepted scene environment and its intensity remain unchanged. In this pinned Three.js renderer, these materials have no private environment map, so the existing scene controls reflection intensity; the module preserves each material's `envMapIntensity` field. There is no new lighting, reflection map, texture download, bitmap edit, external asset, purchase or custom shader pipeline. The accepted base GLB, both optional motion GLBs, equipment and hair modules, five original PNGs and concept portrait atlases remain byte-for-byte unchanged.

The brooch and gem-colored equipment facets remain opaque visual approximations. Equipment shares one vertex-colored metallic material, including its gem-colored facets. This does not implement physical diamond refraction, dispersion, subsurface skin, a new face or a bespoke AAA character. Surface and facial detail, deformation and secondary motion remain separate production work.

The private `verify-artemis-surfaces.mjs` suite compares the actual pinned Three.js loader and factory against the frozen release06 factory. It verifies all unchanged public source hashes and original PNGs, material and texture identities, color spaces and normal data, geometry and rig buffers, finite parameters, the exact NPC gate, all nineteen other variants, the independent player, 120 matching idle-mixer frames, unchanged resource counts and exact-once cleanup with zero shared-resource disposal. Its internal receipt is `ARTEMIS-SURFACES-VERIFICATION.json`; scripts and receipts are not public runtime assets. Node uses an image-decoder stand-in, so it does not replace rendered visual acceptance.

On 10 September 2026 the root task accepted this bounded surface increment in the actual private studio after comparing it with release06 under identical lighting. The review included a direct-light 45-degree view, a side view under the hub reflection map and a full-body rear view. It confirmed readable ice-blue brooch contrast, broad silver equipment facets and clear clothing, undersuit and boot separation. Geometry and the accepted hairstyle remained unchanged.

## Artemis ponytail secondary motion

Artemis's existing NPC ponytail now responds slightly after the head turns and settles as the head stops. It uses two authored deformation modes on the same generated mesh. Only **1,319 of its 5,350 vertices** move; all **4,031 remaining vertices**, including the gathered upper roots, crown, rear scalp closure and face-framing strands, stay fixed. At zero influence, the accepted release07 positions, normals, colors, indices and material values are exact. The model remains **39,190 triangles across nineteen parts**, with the same eleven private materials and main-pass draw count.

The controller measures changes in the existing head's world rotation. An independently written critically damped response follows those changes, with an angular frequency of 8 radians per second and an authored response gain of 2.4. This follows the differential-equation method explained in [Ryan Juckett's damped-spring derivation](https://www.ryanjuckett.com/damped-springs/). There is no independent oscillation clock: a stationary head at rest produces no motion. The signed two-mode weights are limited to a unit disk, bounding combined displacement to **8 mm in world space at the attachment scale**. The verified six-second ordinary idle reaches about **2.41 mm**, while the stronger private turn fixture can reach the full bound. This is an authored secondary response, not physical strand, cloth or collision simulation.

The position and normal morph data are created once before rendering, using [Three.js relative morph attributes](https://threejs.org/docs/pages/BufferGeometry.html). A smooth shear fades the movement into the fixed upper tail. Its inverse-transpose supplies matching normal deltas; the shader normalizes the deformed normals. Base and morph buffers remain immutable during animation. Each update reads the head rotation, advances two scalar spring states and changes two influence weights. It performs no per-frame vertex-array deformation, buffer upload or normal reconstruction. Conservative static bounds include both signed directions of the complete permitted envelope.

Secondary motion has a real resource cost. Four Float32 morph attributes add **256,800 bytes** of application-side position and normal data. The [pinned Three.js r180 morph renderer](https://raw.githubusercontent.com/mrdoob/three.js/r180/src/renderers/webgl/WebGLMorphtargets.js) packs them into one renderer-managed float texture array. At a 16,384-pixel texture limit its payload is **342,400 bytes**; padding at common power-of-two limits from 2,048 to 16,384 can raise that to **524,288 bytes**, with equivalent CPU staging storage. These are payload calculations, excluding driver overhead. The standard morph-enabled vertex shader performs the additional position and normal texture reads; shadow rendering can also need its morph-enabled shader variant. No new material, mesh, triangle, authored bitmap or render pass is added. The legacy `textures` statistic counts authored maps; `rendererManagedTextures` and the motion statistics explicitly report the additional renderer texture.

The existing attachment result provides `update(dt)` and `reset()` handles. The NPC runtime calls the update after the selected idle mixer and passes the original delta. Zero delta, negative or non-finite delta, nonnumeric input, a step over 100 ms, or a discontinuous head turn over 0.45 radians resets the response. Zero delta is the office's existing reduced-motion path. Characters excluded by visibility, distance or the nearest-three animation budget reset to the accepted shape and resume from the current head pose. When the office skips the updater while the document is hidden or a private scene is active, state freezes; the controller accumulates no wall-clock catch-up. Quaternion sign equivalence and angular wraparound follow the short rotation arc without creating a false impulse.

Motion state and morph arrays belong to each Artemis instance. The existing idempotent cleanup releases its private geometry and material once; the pinned renderer releases its morph texture through the geometry's disposal event. The accepted base GLB, both motion GLBs, equipment and surface modules, source PNGs, concept portraits, nineteen other gods and independent player remain unchanged. No world, physics, camera, authentication or office routing behavior is added by this increment.

The private `verify-artemis-hair-motion.mjs` suite uses the actual pinned loader, animation mixer and [Mesh.getVertexPosition](https://threejs.org/docs/pages/Mesh.html). It compares exact release07 factory and hair sources, checks immutable source and material data, 171,200 signed deformed-vertex samples, fixed roots, finite and outward deformed normals, conservative bounds, 360 actual idle frames, lag and settling, and 30/60/120 Hz response consistency. Additional signed-envelope checks at the supported avatar heights of 1.4 and 3 metres confirm the 8 mm world limit and culling bounds. The maximum measured rate difference is approximately **0.0121 mm**. At nine rest, idle and turn poses, 4,029 moving-vertex and triangle-centre samples per pose are checked against actual posed body, collar, scalp, shoulder and bow triangles over each sample's complete signed displacement disk. This is a sampled clearance check, not a continuous collision guarantee for every possible pose. The suite also verifies independent Artemis state, reset/resume cases and exact-once private cleanup with zero shared-resource disposal. Its receipt is `ARTEMIS-HAIR-MOTION-VERIFICATION.json`; both files remain private.

The root task reviewed the accepted motion in the private studio on 10 September 2026 against release07 with identical lighting. It confirmed the exact rest silhouette, a restrained response during real idle, clear shoulder and folded-bow separation at opposite clamped turn-fixture extremes, and visible settling. Repeated candidate recreation kept the recorded renderer resource counts stable. The turn fixture is private review input rather than new character animation. A distinct face and body, strand simulation, more complex deformation and finished bespoke character quality remain later production work.

## Athena equipment increment

`athena-equipment.js` adds original equipment only to the exact Athena NPC on the verified MakeHuman CC0 adult base. A narrow open brow and temple headpiece with a central architectural chevron, a cobalt standing collar with platinum rims, and two asymmetric overlapping shoulder assemblies create a distinct equipment silhouette. The stronger shoulder has three plates; the compact shoulder has two. Fitted upper returns and a rear collar opening keep the jacket and existing ponytail readable. The original body, hair, face, garment geometry, material maps and animations remain unchanged. This is a shared adult base with original Athena equipment, not a unique face, full bespoke costume or finished AAA character.

The design uses selective historical construction cues: the raised helmet and collar-form aegis described by [The Metropolitan Museum of Art's Athena record](https://www.metmuseum.org/art/collection/search/251476), and the overlapping, bevelled, asymmetric shoulder plates described in [The Wallace Collection's pauldron record](https://wallacelive.wallacecollection.org/eMP/eMuseumPlus?module=collection&objectId=60738&service=ExternalInterface). Geometry and ornament are original. No historical model, game costume, image or downloaded asset was copied. The existing Athena concept portrait informed the standing collar and tailored shoulder emphasis.

Four rigid meshes attach in the measured bind pose to `head`, `spine01` and the two upper-arm joints. The existing idle mixer moves those bones; this increment adds no per-frame update, animation, light or texture. Curved outer faces have grouped smooth normals while narrow bevels retain crisp edges. One opaque `MeshStandardMaterial` uses platinum/cobalt vertex colours, metalness 1 and roughness 0.36 under the unchanged scene environment. This is an authored brushed-metal appearance, not measured optical microstructure or a physical armour simulation.

The addition costs **5,580 triangles, 602,640 bytes of retained position/normal/colour attributes, four opaque main-pass draws and one private material**. GPU attribute storage and driver overhead are additional to the application arrays. Temporary fitting data uses cached skinned vertices and an AABB hierarchy and is discarded after construction. A measured 1.8 m attachment call took **468 ms process CPU and 1,581.93 ms wall time**, excluding GLB fetch, parse and cloning. A separate preloaded complete avatar factory sample took **875 ms CPU and 1,902.37 ms wall time**. These are host diagnostics under scheduling contention, not FPS or physical-device benchmarks; further one-time construction optimization or baking remains future work.

The focused verification uses the actual pinned Three.js loader, skeletons and mixer. It checks each closed component's winding, welded edge incidence, positive volume, finite attributes and unit normals; all original source hashes and texture references; all nineteen other gods including Artemis; the independent player; correct scaled attachment; repeated recreation; and exact-once release of four private geometries and one private material with zero shared-resource disposal. At supported heights of 1.4 and 3 m, generated positions and colours are identical to the 1.8 m result, with measured normal-component differences below 3.34e-14. Comparisons allow at most 5e-7 m position error and 3e-5 normal-component error for generated Float32 data; original source buffers and files remain exact.

Over thirteen actual idle poses spanning six seconds, **18,135 triangle-centre clearance samples** each have a finite nearest source triangle. Sampling uses every fourth equipment triangle and includes rear and inner surfaces against the complete original upper body, jacket, collar, face and hair. The minimum sampled surface distance is **0.687 mm** in the base's coordinate space. Maximum measured gaps are approximately **8.60 mm for the headpiece, 27.54 mm for the collar and 33.89 mm for the shoulder assemblies**, including the raised insets. The test explicitly permits a signed tolerance of -1.5 mm and rejects unsigned distances below 0.35 mm; the accepted samples have positive signed values. Full equipment vertices remain within the tested base-coordinate idle envelope of x ±0.27 m, y 1.25-1.70 m and z -0.07 to 0.16 m. The receipt contains the exact measured bounds. This is sampled clearance for the existing NPC idle, not a continuous collision guarantee or approval for arbitrary combat animation. Node image decoding is a stand-in, and rendered acceptance is separate.

The root task accepted the final candidate on 10 September 2026 in a fresh renderer after front-quarter, rear and side idle views, the opposite quarter, head/front direct light and full-body hub reflections. The previously visible rear jacket intrusion and open shoulder-cuff appearance were resolved. Repeated candidate recreation retained stable resource counts in that comparison fixture. The private `verify-athena-equipment.mjs` and `ATHENA-EQUIPMENT-VERIFICATION.json` contain focused evidence; private research and rejected-candidate artifacts remain outside the public allowlist. Existing Artemis appearance, equipment and hair response, all other gods, player movement, world, camera and access behavior remain unchanged.

## Athena equipment precomputation

The next bounded increment changes how the accepted Athena equipment is constructed. Its original release12 geometry is precomputed through the actual pinned loader and 1.8 m avatar factory, then stored losslessly in `athena-equipment-data.js`. The browser no longer skins source vertices for fitting, casts projection rays, synthesizes equipment surfaces or builds a spatial tree. The public synchronous attachment contract, rigid bone transforms, names, sections, appearance metadata, material and disposal behavior remain unchanged. The complete original source generator and regeneration evidence remain private.

The packed data uses exact Float32-bit dictionaries for 2,814 position vectors, 5,212 normal vectors and four colours, with Uint16 lookups restoring the original nonindexed order. It does not quantize, simplify, smooth or regenerate the accepted surface. The decoder reads the packed integers explicitly as little-endian through [ECMAScript DataView](https://tc39.es/ecma262/multipage/structured-data.html#sec-dataview.prototype.getuint32), then copies their bits into Float32 arrays. All 16,740 expanded vertices retain the original positions, normals and colours at 1.8 m. The four meshes still cost **5,580 triangles, four opaque main-pass draws, one material and 602,640 attribute bytes per avatar**. There is no new texture, light, shader variant, animation or per-frame callback.

Decoding runs once on first use. A private **602,640-byte expanded template cache** remains for subsequent attachments, and each avatar receives independent copies of its geometry arrays, section metadata and bounds. The generated module also retains its encoded string and small metadata records; JavaScript object/string representation and driver overhead are not included in the array counts. Temporary byte and dictionary arrays become collectible after decoding. The existing [Three.js buffer geometry](https://threejs.org/docs/pages/BufferGeometry.html) resource lifecycle still releases four owned geometries and one owned material exactly once. Disposing or mutating one avatar does not alter another avatar or the private template cache.

This exchanges transfer size and a shared cache for less synchronous fitting work. The **4,165-byte attachment module plus 266,856-byte data module total 271,021 raw bytes**, compared with the former 18,228-byte procedural module. Local level-9 gzip measurements are **140,200 bytes combined**, compared with 5,642 bytes before. These are compressed-file measurements, not an observed HTTP wire transfer or a claim about the server's compression policy. The packed binary payload is 196,820 bytes. The extra data remains an ordinary static module dependency; no asynchronous asset fetch, loading fallback or new product UI was introduced by the attachment.

In one paired host diagnostic after module import and GLB preload, the first complete factory call measured **937 ms process CPU / 1,138.44 ms wall** for release12 and **63 ms CPU / 22.21 ms wall** for the precomputed version, including its first decode. Three warm attachment-only samples measured 0.50-0.95 ms wall for the new module and 406-1,984 ms for release12, excluding cloning and fetch/parse. The single-call CPU samples for the new warm path were below timer resolution, not zero work. Private receipts also record an aggregate warm attachment-and-cleanup measurement and the root task's separate paired factory comparison. Process CPU and scheduling vary on this host. Imports, network transfer, GPU work and physical-device behavior are outside these timing samples; no end-user loading or FPS improvement is asserted.

Focused verification compares the exact expanded attribute bytes, bounds, sections, material parameters, attachment matrices and character metadata with immutable release12 output. It runs 360 actual idle frames at each of 1.4, 1.8 and 3 m, comparing every equipment vertex and transformed normal at 31 poses per height. World positions and attachment matrices match exactly; maximum measured normal differences at the two other heights remain below 3.34e-14, within the prior 5e-7 m position and 3e-5 normal-component tolerances. It also checks deterministic regeneration, one-time decoding, forbidden source sampling, independent arrays, repeated creation/disposal, injected attachment failure cleanup, all twenty character variants, the player, source maps and immutable file hashes. The existing Athena geometry and sampled-clearance verifier remains unchanged. Node image decoding is a stand-in; rendered acceptance remains a separate browser check.

The root task independently compared all character objects, including Athena equipment, across the existing idle and inspected the unchanged front-quarter and rear appearance. This is a construction optimization of the accepted shared adult base with original Athena equipment. It adds no new face, body, costume, combat motion or physical armour simulation, and does not broaden the prior sampled-clearance guarantee. The private `bake-athena-equipment.mjs`, `verify-athena-bake.mjs` and `ATHENA-BAKE-*` evidence remain outside the public allowlist. Character runtime, Artemis, the other gods, player, world, movement, camera and access behavior remain exact release12 sources.

## Euterpe stage headset

`euterpe-headset.js` adds an original stage headset to Euterpe's existing adult base. An open-face crown, elliptical ear cushions and stepped caps combine graphite, titanium, pale reveals and amber signal inlays. A single rearward fin is seated in a visible socket. The existing face, body, ponytail, costume, source maps and idle remain unchanged. This is original accessory art on a shared adult base, not a bespoke character, functioning audio hardware or a new agent capability.

The design uses a premium hardware material hierarchy informed by [Bang & Olufsen's H100 product page](https://www.bang-olufsen.com/en/int/headphones/beoplay-h100?variant=beoplay-h100-century-brown). All geometry and abstract signal ornament are independently authored; no product model, logo or game asset was copied. The restrained asymmetric fin and amber palette connect the equipment to Euterpe's existing music domain.

A fixed smooth ellipse fits the crown around the bind-pose scalp and hair. Its constants were selected offline against 123 measured surface rays; the public module does no source fitting or ray query. Two rigid meshes use [Three.js bone attachment](https://threejs.org/docs/pages/Object3D.html), guarded for a compatible bind pose and positive uniform scale. The existing head animation drives them. Two opaque private materials and two geometries add **4,980 triangles and 537,840 bytes of position, normal and colour attributes**, plus corresponding GPU storage and driver overhead. There are no new textures, lights, custom shaders or per-frame callbacks. Each instance owns its resources and releases them exactly once; construction failure also cleans up owned resources without disposing borrowed source data.

Focused tests verify forty closed outward components, finite attributes, connected assembly bounds, scale behavior, idempotent attachment, independent resources and failure cleanup. Over thirteen actual idle poses spanning six seconds, **16,185 sampled triangle centres** have a minimum unsigned source-surface distance of **5.515 mm** and minimum outward radial scalp-envelope clearance of **5.758 mm**, measured in avatar coordinates. Nearest-triangle normal-plane signs are retained as diagnostics because a concave ear's local plane does not reliably classify inside versus outside. Independent ray intersections and unsigned distance are the clearance criteria. These finite samples do not guarantee separation for every possible pose or arbitrary combat animation.

A release15/current runtime replay compares all twenty gods over 360 actual idle frames. Original character objects, materials, matrices and animation budgeting remain exact, and the nineteen other gods retain exact metadata. Euterpe changes only through the tagged headset meshes and truthful accessory description. The existing twenty-god loader smoke also passes. The root inspected front, quarter, side, rear, direct-light and hub-reflection views, plus the actual full-body idle. Node image decoding is a test stand-in, and rendered acceptance is separate. A distinct face, body and full costume remain future production work.

## Euterpe stagewear finish

`euterpe-stagewear.js` adds original amber ribbons, shoulder accents, collar bands, outer-leg stripes and one asymmetric three-bar signal motif over graphite tailoring. The design follows the existing Euterpe portrait and stage headset. This is a surface treatment on the shared adult garment topology, not a new body, silhouette, bespoke costume mesh or finished AAA character. The inherited garment layering and sculpted folds remain.

The treatment uses the existing WebGL renderer and [Three.js standard-material compilation hook](https://threejs.org/docs/pages/Material.html). Four private materials receive two fixed pattern modes: body and collar. The body pattern is evaluated in the common bind-position coordinates across the undersuit, outer suit and fitted jacket panels. Using the same continuous pattern across those layers avoids the strongly mismatched underlay colours seen in the rejected vertex-colour prototype. Positions, normals, UVs, indices, skin weights, bones, source textures and animation remain unchanged. Authored sRGB swatches convert once through [Three.js Color](https://threejs.org/docs/pages/Color.html) before entering shader constants in Linear-sRGB. Existing normal maps remain attached.

Seven owned material clones replace ten costume material assignments on Euterpe. Boots, gloves and trim receive quieter finishes, while the brooch takes the amber family without an added glow. The face, eyes, ponytail, stage headset and other nineteen gods are unchanged. The increment adds no geometry, attribute buffers, triangles, meshes, draw calls, textures, lights or per-frame CPU callback. It does add shader variants, one three-component varying and arithmetic for each shaded fragment. Shader compilation and GPU work are real costs; no FPS, loading-speed or physical Android improvement is claimed. The static cache keys distinguish the two pattern modes. This implementation depends on the pinned Three.js WebGL standard shader.

The attachment owns and disposes its seven materials exactly once, restoring borrowed material references when removed. Invalid input, an injected clone failure and an injected partial assignment failure preserve borrowed state and release created resources. Six focused checks, the actual-loader twenty-god smoke and an independent release16/current replay passed. The latter compares 140 original-object snapshots across all twenty gods and 360 animation frames; it includes every original geometry buffer, the headset, body transforms and rig matrices, while the ten intended costume assignments are verified separately. Two supported-height samples retain shared geometry and independent finishes, with no material updates during 360 idle frames.

The root inspected the accepted front-quarter, rear, matched direct-light comparison, full-body hub reflections and actual idle in the browser. The original vertex-colour candidate was rejected because overlapping inherited garment layers made the amber patchy; its geometry copies are absent from the final implementation. A disposal-observer test initially looked up a mesh's restored material rather than capturing the owned material; that instrumentation was corrected and all seven disposal events passed. Node image decoding is a test stand-in, and actual GPU compilation and visual acceptance were checked separately. Owner permissions, world, camera, movement, music, Artemis and Celestyn remain outside this increment.
