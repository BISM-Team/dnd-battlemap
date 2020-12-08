export function buildSceneLods(scene) {
    let i=0;
    let persued = [];
    while (i<scene.meshes.length) 
    {
        if(!persued.find( elem => { return elem === scene.meshes[i].name; })) 
        {
            const meshes = getLods(scene.meshes[i], scene);
            for(let n in meshes) {
                persued.push(meshes[n].name);
            }

            if(meshes.length > 1) {
                meshes.sort((a, b) => {return a.name.charAt(a.name.length-1) - b.name.charAt(a.name.length-1)});
                buildLods(meshes, scene);
            }
        }
        i++;
    }
}

export function getLods(mesh, scene) {
    const meshes = [mesh];
    let n=0;
    while (n<scene.meshes.length) {
        if((scene.meshes[n].name != mesh.name) && (scene.meshes[n].name.length == mesh.name.length) && (scene.meshes[n].name.substr(0, scene.meshes[n].name.length-1) == mesh.name.substr(0, mesh.name.length-1)) ) {
            meshes.push(scene.meshes[n]);
        }
        n++;
    }
    return meshes;
}

export function buildLods(meshes, scene) {
    let newMesh = meshes[0];

    let i=1;
    while (i<meshes.length) {
        newMesh.subMeshes[0].getRenderingMesh().addLODLevel(16*i, meshes[i].subMeshes[0].getRenderingMesh());
        meshes[i].subMeshes[0].getRenderingMesh().isVisible = true;
        i++;
    }

    i=0;
    while (i<meshes.length) {
        uniqueRename(meshes[i], scene);
        i++;
    }
}

export function uniqueRename(mesh, scene) {
    let name = mesh.name;
    mesh.name = "tmp";
    while (scene.getMeshByName(name)) {
        let index = 0;
        name = index + name;
    }
    mesh.name = name;
}