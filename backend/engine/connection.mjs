export class Connection {
    room;

    constructor(room) {
        this.room = room;
    }

    sendUpdateObject(new_object, conn_params) {
        const dump_obj = false;
        conn_params[0].to(this.room).emit('update-object', new_object);
        console.log('send update object ' + (dump_obj ? JSON.stringify(new_object) : '\"' + new_object.name + '\"'));
    }

    sendRemoveObject(obj_name, conn_params) {
        conn_params[0].to(this.room).emit('remove-object', obj_name);
        console.log('send remove object \"' + obj_name + '\"');
    }
}