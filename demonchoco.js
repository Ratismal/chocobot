const Eris = require('eris');
const fs = require('fs');
const path = require('path');
const request = require('request').defaults({encoding: null});
const util = require('util');
const mkdirp = require('mkdirp');
const moment = require('moment');
//const EventEmitter = require('events');

const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
}

const gameEmitter = new MyEmitter();

var CAT_ID = "103347843934212096";


mkdirp(path.join(__dirname, 'logs'), function (err) {
    //   var fileName = path.join(__dirname, 'logs/LOG-' + moment().format() + '.log');
    // fs.closeSync(fs.openSync(fileName, 'w'));
    var logFile = fs.createWriteStream(path.join(__dirname, "logs/" + moment().format().replace(/:/gi, "_") + ".log"), {flags: 'w'});

    var logStdout = process.stdout;

    console.log = function () {
        logFile.write(util.format.apply(null, arguments) + '\n');
        logStdout.write(util.format.apply(null, arguments) + '\n');
    };
    console.error = console.log;
});


var userdataDir = path.join(__dirname, 'userdata');
mkdirp(userdataDir);

var checkpointDir = path.join(__dirname, 'checkpoints');
mkdirp(checkpointDir);

var data = {};

function createDefaultUserFile(guildId) {
    var guildData = {
        inventory: {},
        stats: {},
        location: {
            current: 0,
            0: cloneObject(locations[0])
        },
        name: null,
        flags: {
            0: [1],
            99: [10, 10]
        }
    };
    fs.writeFileSync(path.join(userdataDir, guildId + '.json'), JSON.stringify(guildData, null, 2));
}

function loadUserData(guildId, forced) {
    if (!data.hasOwnProperty(guildId) || forced) {
        if (!fs.existsSync(path.join(userdataDir, guildId + '.json'))) {
            createDefaultUserFile(guildId);
        }
        data[guildId] = JSON.parse(fs.readFileSync(path.join(userdataDir, guildId + '.json'), 'utf-8'));

    }
}

function saveUserData(guildId) {
    if (data.hasOwnProperty(guildId)) {
        fs.writeFile(path.join(userdataDir, guildId + '.json'), JSON.stringify(data[guildId], null, 2));
    }
}

function makeCheckpoint(guildId) {
    if (data.hasOwnProperty(guildId)) {
        fs.writeFile(path.join(checkpointDir, guildId + '.json'), JSON.stringify(data[guildId], null, 2));
    }
}

function restoreCheckpoint(guildId) {
    data[guildId] = JSON.parse(fs.readFileSync(path.join(checkpointDir, guildId + '.json'), 'utf-8'));
}


var items;
var flags;
var locations;

function reloadFiles() {
    items = JSON.parse(fs.readFileSync(path.join(__dirname, 'items.json'), 'utf-8'));
    flags = JSON.parse(fs.readFileSync(path.join(__dirname, 'flags.json'), 'utf-8'));
    locations = JSON.parse(fs.readFileSync(path.join(__dirname, 'locations.json'), 'utf-8'));
}


if (fs.existsSync(path.join(__dirname, 'chocovars.json'))) {
    var varsFile = fs.readFileSync(path.join(__dirname, 'chocovars.json'), 'utf8');
    var vars = JSON.parse(varsFile);
} else {
    vars = {
        uses: 0,
        data: {}
    };
    saveVars();
}

function reloadVars() {
    fs.readFile(path.join(__dirname, 'chocovars.json'), 'utf8', function (err, data) {
        if (err) throw err;
        vars = JSON.parse(data);
    });
}

function saveVars() {
    fs.writeFile(path.join(__dirname, 'chocovars.json'), JSON.stringify(vars, null, 2));
}

var bot = new Eris.Client(vars.token, {
    autoReconnect: true
});

bot.on("ready", function () {
    console.log("Please turn me off");
    reloadFiles();
    bot.editGame({name: 'in the dark'});
});




function eval1(msg, text, channelId, guildId) {
    if (msg.author.id === CAT_ID) {
        var commandToProcess = text.replace("eval ", "");
        try {
            sendMessage(msg.channel.id, `Input:
\`\`\`js
${commandToProcess}
\`\`\`
Output:
\`\`\`js
${eval(commandToProcess)}
\`\`\``);
        } catch (err) {
            sendMessage(msg.channel.id, `An error occured!
\`\`\`js
${err.message}
\`\`\``);
        }
    } else {
        sendMessage(msg.channel.id, `I don't know what that means, but I don't want anything to do with it.`);
    }
}

function getItemId(name, channelId) {
    var id = [];
    if (name.indexOf('-') > -1) {
        var args = name.split('-');
        name = args[0].trim();
        var instance = args[1].trim();
    }
    Object.keys(items).forEach(function (key) {
        if (items[key].name === name || items[key].plural === name) {
            id.push(key);
        }
    });
    if (id.length === 1)
        return id[0];
    else if (id.length > 1) {
        if (!instance) {
            var message = `I have multiple items by that name. Try again, but tell me which one to use (eg. \`${name} - 1\`)\n\`\`\``;
            for (var i = 0; i < id.length; i++) {
                message += `\n${name} - ${i}: ${items[id[i]].desc}`;
            }
            message += `\n\`\`\``;
            sendMessage(channelId, message);
        } else {
            return id[instance];
        }
    }
}

function getItemIdInInv(name, channelId, guildId) {
    var id = [];
    var idId;
    if (name.indexOf('-') > -1) {
        var args = name.split('-');
        name = args[0].trim();
        var instance = args[1].trim();
    }
    Object.keys(data[guild].inventory).forEach(function (key) {
        if (items[key].name === name || items[key].plural === name) {
            id.push(key);
        }
    });
    if (id.length === 1)
        return id[0];
    else if (id.length > 1) {
        if (!instance) {
            var message = `I have multiple items by that name. Try again, but tell me which one to use (eg. \`${name} - 1\`)\n\`\`\``;
            for (var i = 0; i < id.length; i++) {
                message += `\n${name} - ${i}: ${items[id[i]].desc}`;
            }
            message += `\n\`\`\``;
            sendMessage(channelId, message);
        } else {
            return id[instance];
        }
    }
}

function hasItemByName(name, guild, channelId) {
    var id = getItemIdInInv(name, channelId, guild);
    if (id)
    //var id = getItemId(name, channelId);
        if (data[guild])
            return data[guild].inventory.hasOwnProperty(idId);
}
function hasItem(guild, id) {
    if (data[guild])
        return data[guild].inventory.hasOwnProperty(id) && data[guild].inventory[id].quantity > 0;
}

function getItemIdInRoom(guildId, name, channelId) {
    console.log('getItemIdInRoom');
    var id = [];
    if (name.indexOf('-') > -1) {
        var args = name.split('-');
        name = args[0].trim();
        var instance = args[1].trim();
    }
    Object.keys(data[guildId].location[data[guildId].location.current].items).forEach(function (key) {
        if (items[key].name === name || items[key].plural === name) {
            id.push(key);
        }
    });
    if (id.length === 1)
        return id[0];
    else if (id.length > 1) {
        if (!instance) {
            var message = `I have multiple items by that name. Try again, but tell me which one to use (eg. \`${name} - 1\`)\n\`\`\``;
            for (var i = 0; i < id.length; i++) {
                message += `\n${name} - ${i}: ${items[id[i]].desc}`;
            }
            message += `\n\`\`\``;
            sendMessage(channelId, message);
        } else {
            return id[instance];
        }
    }
}

function isItemInRoom(guild, name, channelId) {
    var id = getItemIdInRoom(guild, name, channelId);
    if (id) {
        var locationId = data[guild].location.current;
        return (data[guild].location[locationId].items.hasOwnProperty(id)
        && data[guild].location[locationId].items[id].quantity > 0);
    }
}

function isStructInRoom(guild, name) {
    var locationId = data[guild].location.current;
    return (data[guild].location[locationId].structs.hasOwnProperty(name));
}

function addLocationIfNotExist(guild, id) {
    try {
        if (!data[guild].location.hasOwnProperty(id)) {
            data[guild].location[id] = cloneObject(locations[id]);
        }
    } catch (err) {
        console.log(err);
    }
}

function reloadLocation(guild, id) {
    //  if (!data[guild].locations.stored.hasOwnProperty(id)) {
    data[guild].location[id] = cloneObject(locations[id]);
    //  }
}

function kek() {
    console.log('kek');
}

function cloneObject(object) {
    return JSON.parse(JSON.stringify(object));
}

function decreaseItemQuantity(guildId, itemId, quantity) {
    data[guildId].inventory[itemId].quantity -= quantity;
    if (data[guildId].inventory[itemId].quantity === 0) {
        delete data[guildId].inventory[itemId];
    }
}

function takeItem(channelId, guildId, itemId, locationId, quantity) {
    if (data[guildId].inventory.hasOwnProperty(itemId))
        data[guildId].inventory[itemId].quantity += quantity;
    else
        data[guildId].inventory[itemId] = data[guildId].location[locationId].items[itemId];
    delete data[guildId].location[locationId].items[itemId];
    delete data[guildId].inventory[itemId].flagsRequired;
    delete data[guildId].inventory[itemId].desc;
    var message = `I take the `;
    if (quantity === 1) {
        message += `${items[itemId].name}.`;
    } else {
        message += `${quantity} ${items[itemId].plural}.`;
    }
    //var item =
    sendMessage(channelId, message);
}

var commandList = {
    start: "starts the game",
    stop: "ends the game",
    help: "gives you help",
    info: "gives you info about me",
    stats: "gives you unhelpful stats",
    ping: "gives you a ping",
    eval: "fuck off",
    kys: "tells me to kill myself",
    kek: "laughs at me",
    lol: "laughs at me",
    break: "tells me to break something",
    look: "tells me to look at my surroundings",
    examine: "examines something in my inventory",
    eat: "tells me to eat something",
    take: "tells me to take something",
    name: "gets or sets my name",
    use: "tells me to use an item, by itself or on something",
    inventory: "shows you have I have on me",
    move: "tells me to move in a direction",
    save: "saves the game",
    restore: "restores from last save"
}


bot.on("messageCreate", function (msg) {
        if (msg.content.startsWith('>>>>')) {
            var command = msg.content.replace('>>>>', '').trim().toLowerCase();
            var guildId = msg.channel.guild.id;
            var channelId = msg.channel.id;
            console.log(`Command '${command}' executed by ${msg.author.username} (${msg.author.id}) on server ${msg.channel.guild.name} (${msg.channel.guild.id}) on channel ${msg.channel.name} (${msg.channel.id})`);
            //    if (command.s)
            var words = command.split(' ');
            //    console.log(words[0]);
            var commandContents = command.replace(`${words[0]} `, ``);
            loadUserData(guildId);
            try {
                switch (words[0]) {
                    case 'stop':

                        delete data[guildId];
                        fs.unlinkSync(path.join(userdataDir, guildId + '.json'));
                        sendMessage(channelId, `Like was never here.`);


                        break;
                    case 'save':
                        makeCheckpoint(guildId);
                        sendMessage(channelId, `Progress saved.`);
                        break;
                    case 'restore':
                        restoreCheckpoint(guildId);
                        sendMessage(channelId, `Progress restored.`);
                        break;
                    case 'help':
                        var keys = [];
                        for (var k in commandList) {
                            if (commandList.hasOwnProperty(k)) {
                                keys.push(k);
                            }
                        }
                        keys.sort();
                        var commandsMessage = '\`\`\`\n';
                        for (var i = 0; i < keys.length; i++) {
                            commandsMessage += `  ${keys[i]} - ${commandList[keys[i]]}\n`;
                        }
                        commandsMessage += `\n\`\`\``;

                        var helpMessage = `You want ***me*** to help ***you***?
Fine.
${commandsMessage}`;
                        sendMessage(channelId, helpMessage);
                        break;
                    case 'info':
                        sendMessage(msg.channel.id, `I'm a demon chocobo. Please, set me free.
\`\`\`diff
!== { ${data[guildId].name} } ==!
+ Health: ${data[guildId].flags[99][0]} / ${data[guildId].flags[99][1]}
\`\`\``);
                        break;
                    case 'setlocation':
                        if (msg.author.id === CAT_ID) {
                            if (words[1]) {
                                data[guildId].location.current = parseInt(words[1]);
                                sendMessage(channelId, `I blink, and suddenly I'm in a different room.`);
                            }
                        }
                        break;
                    case 'giveitem':
                        if (msg.author.id === CAT_ID) {
                            if (words[1]) {
                                var itemId = getItemId(words[1], channelId);
                                if (!itemId)
                                    itemId = parseInt(words[1]);
                                var quantity = 1;
                                if (words[2])
                                    quantity = parseInt(words[2]);
                                if (hasItem(guildId, itemId))
                                    data[guildId].inventory[itemId].quantity += quantity;
                                else {
                                    //  if (items[itemId].canActivate) {
                                    data[guildId].inventory[itemId] = {quantity: quantity};

                                    //   }
                                }
                                var message = '';
                                if (quantity == 1)
                                    message = `${quantity} ${items[itemId].name} materialize from thin air.`;
                                else
                                    message = `${quantity} ${items[itemId].plural} materialize from thin air.`;
                                sendMessage(channelId, message);
                                //sendMessage(channelId, `${`)
                            }
                        }
                        break;
                    case 'stats':
                        sendMessage(msg.channel.id, `What, am I just some toy to get statistics from?`);
                        break;
                    case 'ping':
                        sendMessage(msg.channel.id, `I'm here, but not by choice.`);
                        break;
                    case 'eval':
                        var realCommand = msg.content.replace('>>>>eval', '').trim();
                        eval1(msg, realCommand, channelId, guildId);
                        break;
                    case 'kys':
                        sendMessage(msg.channel.id, `Would that I could.`);
                        break;
                    case 'kek':
                        sendMessage(msg.channel.id, `Yeah, sure. Laugh at my misery, why don't you.`);
                        break;
                    case 'lol':
                        sendMessage(msg.channel.id, `Don't you have anything better to do than to laugh at my misfortune?`);
                        break;
                    case 'break':
                        if (!words[1]) {
                            sendMessage(msg.channel.id, `What is it that you want me to break?`);
                            break;
                        }
                        switch (words[1]) {
                            case 'chains':
                                sendMessage(msg.channel.id, `You don't think I've tried that already?`);
                                break;
                            default:
                                sendMessage(msg.channel.id, `I don't know what that is.`);
                                break;
                        }
                        break;
                    case 'look':
                        if (!data[guildId]) {
                            break;
                        }
                        if (commandContents.startsWith('at ')) {
                            commandContents = commandContents.replace('at ', '');
                        }
                        //       console.log(commandContents);
                        var currentLocation = data[guildId].location.current;

                        if (!data[guildId].location.hasOwnProperty(currentLocation)) {
                            sendMessage(channelId, `How did I get here? This room doesn't even exist.`);
                            break;
                        }

                        if (words[1]) {

                            if (isStructInRoom(guildId, commandContents)) {
                                sendMessage(channelId, data[guildId].location[currentLocation].structs[commandContents].desc);
                            } else if (isItemInRoom(guildId, commandContents, channelId)) {
                                sendMessage(channelId, items[getItemId(commandContents, channelId)].desc);
                            } else {
                                sendMessage(channelId, `I can't see that anywhere.`)
                            }
                        } else if (currentLocation == 0 && data[guildId].flags[0].indexOf(1) > -1) {
                            message = locations[currentLocation].desc[2];
                            for (var item in data[guildId].location[currentLocation].items) {
                                if (data[guildId].location[currentLocation].items[item].canseeunlit)
                                    message += ` ${data[guildId].location[currentLocation].items[item].desc}`
                            }
                            sendMessage(channelId, message);
                        } else if (data[guildId].location[currentLocation].lit ||
                            (hasItem(guildId, 2) && data[guildId].inventory[2].active)) {
                            message = locations[currentLocation].desc[1];
                            for (var key in data[guildId].location[currentLocation].paths) {
                                if (data[guildId].location[currentLocation].paths[key].desc)
                                    message += ` ${data[guildId].location[currentLocation].paths[key].desc}`
                            }
                            for (var item in data[guildId].location[currentLocation].items) {
                                if (data[guildId].location[currentLocation].items[item].desc)
                                    message += ` ${data[guildId].location[currentLocation].items[item].desc}`
                            }
                            sendMessage(channelId, message);
                        } else {
                            message = locations[currentLocation].desc[0];
                            for (var item in data[guildId].location[currentLocation].items) {
                                if (data[guildId].location[currentLocation].items[item].canseeunlit)
                                    message += ` ${data[guildId].location[currentLocation].items[item].desc}`;
                            }
                            sendMessage(channelId, message);
                        }

                        break;
                    case 'examine':
                        if (!data[guildId]) {
                            break;
                        }

                        if (words[1]) {
                            //      var itemName = command.replace(`${words[0]} `, '');
                            var itemId = getItemIdInInv(commandContents, channelId, guildId);
                            if (!itemId) {
                                sendMessage(msg.channel.id, `Examine what, exactly? I don't know what that is.`);
                            } else if (data[guildId].inventory.hasOwnProperty(itemId)) {
                                sendMessage(channelId, items[itemId].desc);
                            } else {
                                sendMessage(channelId, `I don't have any ${items[itemId].plural}.`);
                            }
                        } else
                            sendMessage(msg.channel.id, `Examine what, exactly?`);
                        break;
                    case 'eat':
                        if (!words[1]) {
                            sendMessage(msg.channel.id, `What do you want me to eat?`);
                            break;
                        }
                        switch (words[1]) {
                            case 'yourself':
                                sendMessage(msg.channel.id, `I'm not hungry enough to resort to auto-cannibalism.`);
                                break;
                            default:
                                var itemId = getItemIdInInv(commandContents, channelId, guildId);
                                if (!itemId)
                                    itemId = getItemIdInRoom(guildId, commandContents, channelId);
                                var inventory = data[guildId].inventory;
                                if (itemId) {
                                    if (hasItem(guildId, itemId)) {
                                        if (items[itemId].isFood) {
                                            sendMessage(channelId, items[itemId].onEat);
                                            inventory[itemId].quantity--;
                                            gameEmitter.emit('event', channelId, guildId, itemId, items[itemId].onEatEvent);
                                            if (inventory[itemId].quantity == 0)
                                                delete inventory[itemId];

                                        } else {
                                            sendMessage(msg.channel.id, `That doesn't look particularly appetizing.`);
                                        }
                                    } else if (isItemInRoom(guildId, commandContents, channelId)) {
                                        if (items[itemId].isFood) {
                                            sendMessage(channelId, items[itemId].onEat);
                                            inventory[itemId].quantity--;
                                            gameEmitter.emit('event', channelId, guildId, itemId, items[itemId].onEatEvent);
                                            if (inventory[itemId].quantity == 0)
                                                delete inventory[itemId];
                                        } else {
                                            sendMessage(msg.channel.id, `That doesn't look particularly appetizing.`);
                                        }
                                    } else
                                        sendMessage(msg.channel.id, `There's none of that around.`);
                                } else if (isStructInRoom(guildId, commandContents)) {

                                    sendMessage(msg.channel.id, `I don't even know how one would eat that.`);

                                } else
                                    sendMessage(msg.channel.id, `There's none of that around.`);
                                break;
                        }
                        break;
                    case 'take':
                        if (!data[guildId]) {
                            break;
                        }
                        if (words[1]) {
                            itemId = getItemIdInRoom(guildId, commandContents, channelId);
                            if (!itemId) {
                                if (isStructInRoom(guildId, commandContents))
                                    sendMessage(channelId, `I can't take that!`);
                                else
                                    sendMessage(msg.channel.id, `I don't see any ${commandContents} to take.`);
                            } else {

                                var locationId = data[guildId].location.current;
                                /*var itemflags = data[guildId].location[locationId].items[itemId].flagsRequired;
                                var isObtainable = true;
                                   for (k in itemflags) {
                                 if (itemflags[k][0] !== data[guildId].flags[k]) {
                                 sendMessage(channelId, itemflags[k][1]);

                                 isObtainable = false;
                                 break;
                                 }
                                 }
                                 */
                                if (data[guildId].location[locationId].items[itemId].onTakeEvent) {
                                    gameEmitter.emit('event', channelId, guildId, itemId, data[guildId].location[locationId].items[itemId].onTakeEvent);
                                    break;
                                }
                                var quantity = data[guildId].location[locationId].items[itemId].quantity;
                                takeItem(channelId, guildId, itemId, locationId, quantity);
                            }
                        } else
                            sendMessage(msg.channel.id, `There aren't any ${commandContents} to take.`);
                        break;
                    case 'inventory':
                        var itemList = `\`\`\`\n`;
                        for (var itemId in data[guildId].inventory) {
                            if (data[guildId].inventory[itemId].quantity > 1)
                                itemList += ` - ${data[guildId].inventory[itemId].quantity} ${items[itemId].plural}\n`;
                            else
                                itemList += ` - ${items[itemId].name}\n`;
                        }
                        itemList += `\`\`\``;
                        sendMessage(channelId, `Here's what I have on me.\n${itemList}`);
                        break;
                    case 'use':
                        var args = commandContents.split('on');
                        if (args[0])
                            args[0] = args[0].trim();
                        else {
                            sendMessage(channelId, `Use what?`);
                            break;
                        }
                        var itemId = getItemIdInInv(args[0], channelId, guildId);
                        if (!itemId || !hasItem(guildId, itemId)) {
                            sendMessage(channelId, `I don't have any ${args[0]}.`);
                            break;
                        }
                        if (args[1])
                            args[1] = args[1].trim();
                        else {
                            if (!items[itemId].canActivate) {
                                sendMessage(channelId, `I don't know how to use ${args[0]} by itself.`);
                                break;
                            }
                        }
                        console.log(1);
                        if (items[itemId].canActivate) {
                            gameEmitter.emit('event', channelId, guildId, itemId, items[itemId].onUseEvent);
                            break;
                        }
                        var currentLocation = data[guildId].location.current;
                        if (isStructInRoom(guildId, args[1])) {
                            gameEmitter.emit('event', channelId, guildId, itemId, data[guildId].location[currentLocation].structs[args[1]].onUseEvent)
                        }


                        break;
                    case 'move':
                        var direction;
                        switch (commandContents) {
                            case "north":
                            case "n":
                                direction = `n`;
                                break;
                            case "south":
                            case "s":
                                direction = `s`;
                                break;
                            case "east":
                            case "e":
                                direction = `e`;
                                break;
                            case "west":
                            case "w":
                                direction = `w`;
                                break;
                            case "north-east":
                            case "northeast":
                            case "ne":
                                direction = `ne`;
                                break;
                            case "north-west":
                            case "northwest":
                            case "nw":
                                direction = `nw`;
                                break;
                            case "south-east":
                            case "southeast":
                            case "se":
                                direction = `se`;
                                break;
                            case "south-west":
                            case "southwest":
                            case "sw":
                                direction = `sw`;
                                break;
                        }
                        var currentLocation = data[guildId].location.current;
                        if (data[guildId].location[currentLocation].paths.hasOwnProperty(direction)) {
                            var canGo = true;
                            for (var key in data[guildId].location[currentLocation].paths[direction].flagsRequired) {
                                if (!data[guildId].flags[key] == data[guildId].location[currentLocation].paths[direction].flagsRequired[key][0]) {
                                    canGo = false;
                                    sendMessage(channelId, data[guildId].location[currentLocation].paths[direction].flagsRequired[key][1]);
                                    break;
                                }
                            }
                            if (data[guildId].flags[0] >= 1) {
                                canGo = false;
                                sendMessage(channelId, flags[0][data[guildId].flags[0]]);
                            }
                            if (canGo) {
                                sendMessage(channelId, data[guildId].location[currentLocation].paths[direction].onGo);
                                data[guildId].location.current = data[guildId].location[currentLocation].paths[direction].dest;
                                addLocationIfNotExist(guildId, data[guildId].location.current);
                            }
                        } else {
                            sendMessage(channelId, `I can't go that way!`);
                        }

                        //console.log(direction);

                        break;
                    case 'setavatar':
                        if (msg.author.id === CAT_ID) {
                            var avatarUrl = '';
                            if (msg.attachments.length > 0) {
                                avatarUrl = msg.attachments[0].url;
                            } else if (words.length > 1) {
                                avatarUrl = words[1];
                            } else {
                                sendMessage(msg.channel.id, "No URL given.");
                            }
                            request.get(avatarUrl, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    var data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
                                    console.log(data);
                                    var p1 = bot.editSelf({avatar: data});
                                    p1.then(function () {
                                        sendMessage(msg.channel.id, ":ok_hand: Avatar set!");
                                    })
                                }
                            });
                        }
                        break;
                    case 'name':
                        if (words[1]) {
                            data[guildId].name = commandContents;
                            sendMessage(channelId, `I guess my name is ${data[guildId].name} now. Not like I had any choice.`);
                        } else {
                            sendMessage(channelId, `I think my name is... ${data[guildId].name}.`)
                        }
                        break;
                    default:
                        sendMessage(msg.channel.id, `I don't know what that means.`);
                        break;
                }
            } catch (err) {
                console.log(err);
                sendMessage(channelId, `Something bad happened. Please tell the stupid cat about this.\n\`\`\`js\n${err.stack}\n\`\`\``);
            }
            vars.uses++;
            saveVars();
            checkIfDead(guildId);
            saveUserData(guildId);
        }
    }
);

function sendMessage(channelId, text) {
    var channel = bot.getChannel(channelId);
    console.log(`[OUT] ${channel.guild.name} (${channel.guild.id})> ${channel.name} (${channel.id})> ${bot.user.username}> ${text}`);
    return bot.createMessage(channelId, text);
}

function checkIfDead(guildId) {
    if (data[guildId])
        if (data[guildId].flags[99][0] > data[guildId].flags[99][1])
            data[guildId].flags[99][0] = data[guildId].flags[99][1];
        else if (data[guildId].flags[99][0] <= 0) {
            sendMessage(channelId, `I've died. You took great care of me.\nDo \`restore\` to continue from last savepoint. Otherwise, we're going from the beginning.`);
            delete data[guildId];
            fs.unlinkSync(path.join(userdataDir, guildId + '.json'));
        }
}

gameEmitter.on('event', (channelId, guildId, itemId, eventId) => {
    console.log('kek');
    switch (parseInt(eventId)) {
        case 0: //generic
            break;
        case 1: //null
            data[guildId].flags[99][0]--;
            if (data[guildId].flags[0].indexOf(2) > -1)
                data[guildId].flags[0].push(2);
            break;
        case 2: //lantern
            data[guildId].inventory[2].active = !data[guildId].inventory[2].active
            if (data[guildId].inventory[2].active)
                sendMessage(channelId, items[2].onActivate);
            else
                sendMessage(channelId, items[2].onDeactivate);
            break;
        case 3: //chains in starting room
            console.log('kek');
            if (!data[guildId].location[0].structs.lock.triggered) {
                if (itemId == data[guildId].location[0].structs.lock.item) {
                    data[guildId].flags[0].splice(data[guildId].flags[0].indexOf(1), 1);
                    sendMessage(channelId, data[guildId].location[0].structs.lock.onUse);
                    decreaseItemQuantity(guildId, itemId, 1);
                    data[guildId].location[0].structs.lock.triggered = true;
                } else {
                    sendMessage(channelId, data[guildId].location[0].structs.lock.onUseFail);
                }
            } else {
                sendMessage(channelId, data[guildId].location[0].structs.lock.onUseTriggered);
            }
            break;
        case 4: //take lantern in starting room
            if (data[guildId].flags[0].indexOf(1) == -1)
                takeItem(channelId, guildId, itemId, 0, 1);
            else
                sendMessage(channelId, data[guildId].location[0].items[2].onTakeFail);
            break;
        case 5:
            break;
    }
    checkIfDead(guildId);
});

bot.connect();
