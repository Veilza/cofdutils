export class BeatsMenu extends FormApplication {
  // Modify the defaults
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["form"],
      title: "Beats Menu",
      id: "beatsmenu",
      template: "modules/cofdutils/templates/beatsmenu.hbs",
      width: 600,
      height: 230,
      resizable: false,
      minimizable: true,
      closeOnSubmit: false,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "players"
      }],
      dragDrop: [{
        dragSelector: ".entity.actor",
        dropSelector: null
      }]
    })
  }

  // Set initial data for the template
  constructor() {
    super()
    this.currentBeats = game.settings.get("cofdutils", "beatsmenu-currentBeats")
    this.activePlayers = game.settings.get("cofdutils", "beatsmenu-activePlayers")
  }

  // Send data to the template
  getData() {
    const data = super.getData()

    // Define some Handlebars variables
    data.currentBeats = this.currentBeats
    data.playerList = []

    // Re-render the actor's data each time the data is called for
    if(this.activePlayers.length > 0){
      this.activePlayers.forEach(actorID => {
        if(this.isActorAlive(actorID)){
          // Get the actor's sheet
          const player = fromUuidSync(actorID)
          
          // Get the current number of beats by adding up the initial
          // amount and combining it with the progress overall
          const currentBeats = [{
            name: "INITIAL",
            beats: player.system.beats + (5 * player.system.experience)
          }].concat(player.system.progress)

          // Define current number of beats via their progress
          const beats = currentBeats.reduce((acc, cur) => {
            if (cur && cur.beats) {
              return acc + cur.beats;
            } else {
              return acc
            }
          }, 0)

          // Push only the data we need and format it nicely for Handlebar rendering
          data.playerList.push({
            id: player.uuid,
            img: player.img,
            name: player.name,
            beats: (beats % 5),
            xp: Math.floor(beats / 5)
          })
        }
      })
    }

    return data
  }

  // When the form is updated, re-render the template
  _updateObject(event, formData) {
    console.log("Sheet re-rendered.")
    this.render()
  }

  // Listeners for when the sheet is opened
  activateListeners(html) {
    super.activateListeners(html)

    // Tie functions to buttons
    html.find(".addBeats").click(this.newBeatsDialogue.bind(this))
    html.find(".distributeBeats").click(this._distributeBeats.bind(this))
    html.find(".dropBeats").click(this._dropTheBeats.bind(this))
    html.find(".dropActors").click(this._dropActors.bind(this))
    html.find(".player").click(this._givePlayerBeats.bind(this))
    html.find(".player").contextmenu(this._removeActor.bind(this))
  }

  // Response to an actor being dropped onto the beats menu
  _onDrop(event) {
    let data

    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'))
    }
    catch (err) {
      return false
    }


    if (data.type == 'Actor') {
      this.addActor(data.uuid)
    }
  }

  // Function to update the beats setting
  updateBeats(newBeats, replace) {
    // Only go forward if the newBeats are a number
    if(typeof newBeats === "number"){
      if(replace){
        // Replace the current number of beats with the given amount

        // Update the game settings and the beatsMenu data, then re-render
        game.settings.set("cofdutils", "beatsmenu-currentBeats", newBeats)
        this.currentBeats = newBeats
      } else {
        // Otherwise, just add the new beats in

        // Define variables
        const currentBeats = this.currentBeats
        const newBeatsTotal = currentBeats + newBeats

        // Update the game settings and the beatsMenu data, then re-render
        game.settings.set("cofdutils", "beatsmenu-currentBeats", newBeatsTotal)
        this.currentBeats = newBeatsTotal
      }

      this.render()
    }
  }

  // Function to update the actors setting
  updateActors(operation, newData) {
    // Switch case to determine what to do with the data
    switch(operation){
      // Clear the list
      case "clear":
        // Setting the length to 0 is a simple and effective way to clear it
        this.activePlayers.length = 0

        break

      // Append new actors to the list
      case "add":
        // Push actor to the list
        this.activePlayers.push(newData)

        break

      // Wholly replace the previous list with the new data
      case "replace":
        // Fill in the list with the new data
        this.activePlayers = newData

        break
      default:
        console.log(`CofDUtils BeatsMenu: ${game.i18n.localize("CofD.Error.noOperationSpecified")}`)
    }

    // Update the game settings with the updated list
    game.settings.set("cofdutils", "beatsmenu-activePlayers", this.activePlayers)

    // Re-render the page
    this.render()
  }

  // Adding new beats function
  newBeatsDialogue(){
      // Generate a new dialogue to input the number of beats
      let d = new Dialog({
       title: game.i18n.localize("CofD.BeatsMenu.title"),
       content: `
        <form>
          <div class="form-group addBeats">
            <div>
              <label>${game.i18n.localize("CofD.BeatsMenu.newBeats")}</label>
              <input type="number" id="newBeats"/>
            </div>
          </div>
        </form>`,
       buttons: {
         submit: {
           icon: '<i class="fas fa-check"></i>',
           label: `${game.i18n.localize("CofD.BeatsMenu.addBeats")}`,
           callback: (html) => {
             // Define the new number of beats, and force it to be a number
             const newBeats = Number(html.find('#newBeats')[0].value)

             // Set the new number of beats in the module
             this.updateBeats(newBeats)

             // Define the chat message to output
             const message = `${game.i18n.localize("CofD.BeatsMenu.Message.added")} ${newBeats} ${game.i18n.localize("CofD.BeatsMenu.Message.newBeats")} ${this.currentBeats}`

             // Generate a chat message to notify everyone that story beats have been added
             ChatMessage.create({
               content: message,
               speaker: {
                 alias: game.i18n.localize("CofD.BeatsMenu.alias")
               }
             }, {})
           }
         },
         cancel: {
           icon: '<i class="fas fa-times"></i>',
           label: game.i18n.localize("CofD.cancel")
         }
       },
       default: "cancel"
      })
      
      // Render the dialogue
      d.render(true)
    }

    // Distribute beats function
    _distributeBeats() {
      // set of players to distribute.
      const actors = this.activePlayers

      if(actors.length > 0){
        // Define how many beats each player gets.
        const beatsPerPlayer = ~~(this.currentBeats / actors.length) // Whole number
        const remainderBeats = (this.currentBeats % actors.length) // Remainder

        // Start of a chat message for awarding beats.
        let msg = `
          <b>${beatsPerPlayer} ${game.i18n.localize("CofD.BeatsMenu.Message.beatsAwarded")}</b>
          <br>${game.i18n.localize("CofD.BeatsMenu.Message.recipients")}:
        `

        // Promise chain to keep everything in sane order
        const promiseMeBeats = new Promise((resolve, reject) => {
          actors.forEach(actorID =>
          {
            // Check if the actors exist still, because if they don't this could
            // cause an error
            if(this.isActorAlive(actorID)){
              // Define variables for updating the beats
              const playerSheet = fromUuidSync(actorID)
              let progress = playerSheet.system.progress ? duplicate(playerSheet.system.progress) : []
 
              // Push new data to the current
              progress.push({
                name: game.i18n.localize("CofD.BeatsMenu.newBeatsDefaultReason"),
                beats: beatsPerPlayer,
                arcaneBeats: 0
              })
 
              // Update the progress data with the new information
              playerSheet.update({
                'system.progress': progress
              })

              // Add each actor's name to the chat message
              msg += `${fromUuidSync(actorID).name}, `
            }
          })

          // Wrap up crafting the chat message by removing the last ", " and replacing it with a period
          msg = msg.substring(0, msg.length-2)
          msg += '.'

          resolve()
        })

        // Send an update to the beats
        const promiseMeBeats2 = new Promise((resolve, reject) => {
          this.updateBeats(remainderBeats, true)

          resolve()
        })

        // Generate a chat message to notify everyone that story beats have been distributed
        const promiseMeBeats3 = new Promise((resolve, reject) => {
          ChatMessage.create({
            content: msg,
            speaker: {
              alias: game.i18n.localize("CofD.BeatsMenu.alias")
            }
          }, {})

          resolve()
        })

        // Go through the promise chain
        promiseMeBeats
          .then(promiseMeBeats)
          .then(promiseMeBeats2)
          .then(promiseMeBeats3)
          .then(console.log("CofDUtils BeatsMenu: Beats distributed to players!"))
      }
    }

    // Set the number of grroup beats to 0
    _dropTheBeats(){
      const message = game.i18n.localize("CofD.BeatsMenu.Message.dropBeats")

      // Set the number of beats to 0
      this.updateBeats(0, true)

      // Generate a chat message to notify everyone that story beats have been added
      ChatMessage.create({
        content: message,
        speaker: {
          alias: game.i18n.localize("CofD.BeatsMenu.alias")
        }
      }, {})
    }

    // Simple binding function to clear the actors list
    _dropActors(){
      this.updateActors("clear")
    }

    // When a player icon is clicked, open up the player edit menu
    _givePlayerBeats(player) {
      // Get ID of the player clicked
      const actorID = player.currentTarget.id
      const actor = fromUuidSync(actorID)
      const actorName = actor.name

      // Generate a new dialogue to input the number of beats
      let d = new Dialog({
       title: `${game.i18n.localize("CofD.BeatsMenu.awardSoloBeatsTitle")} ${actorName}`,
       content: `
        <form>
          <div class="form-group addBeats">
            <div class="addBeatsRow">
              <label>${game.i18n.localize("CofD.BeatsMenu.newBeatsReason")}</label>
              <input type="text" id="newBeatsReason" value="${game.i18n.localize("CofD.BeatsMenu.newBeatsDefaultReason")}" placeholder="${game.i18n.localize("CofD.BeatsMenu.newBeatsDefaultReason")}"/>
            </div>
            <div class="addBeatsRow">
              <label>${game.i18n.localize("CofD.BeatsMenu.newBeats")}</label>
              <input type="number" id="newBeats"/>
            </div>
          </div>
        </form>`,
       buttons: {
         submit: {
           icon: '<i class="fas fa-check"></i>',
           label: `${game.i18n.localize("CofD.BeatsMenu.awardSoloBeats")}`,
           callback: (html) => {
             // Define the input variables
             const newBeats = Number(html.find('#newBeats')[0].value)
             const newBeatsReason = html.find('#newBeatsReason')[0].value || game.i18n.localize("CofD.BeatsMenu.newBeatsDefaultReason")

             // Define actor variables
             const actor = fromUuidSync(actorID)
             let progress = actor.system.progress ? duplicate(actor.system.progress) : []

             // Push new data to the current
             progress.push({
               name: newBeatsReason,
               beats: newBeats,
               arcaneBeats: 0
             })

             // Update the progress data with the new information
             actor.update({
               'system.progress': progress
             })

             // Define the chat message to output
             const message = `${actorName} ${game.i18n.localize("CofD.BeatsMenu.Message.soloBeats1")} ${newBeats} ${game.i18n.localize("CofD.BeatsMenu.Message.soloBeats2")}`

             // Generate a chat message to notify everyone that story beats have been added
             ChatMessage.create({
               content: message,
               speaker: {
                 alias: game.i18n.localize("CofD.BeatsMenu.alias")
               }
             }, {})
           }
         },
         cancel: {
           icon: '<i class="fas fa-times"></i>',
           label: game.i18n.localize("CofD.cancel")
         }
       },
       default: "cancel"
      })

      // Render the dialogue
      d.render(true)
    }

    // Add a new actor to the active players list
    addActor(actorID) {
      // Define the actor data
      const actor = fromUuidSync(actorID)

      // Check if the actor is unique in the already existing list;
      // Returns true if it's found, or false if it's not found
      const actorUniqueCheck = this.activePlayers.find(players => players == actorID)

      // If the actor exists and is unique
      if (!actorUniqueCheck) {
        // Push to the players list
        this.updateActors("add", actorID)
      }
    }

    _removeActor(player) {
      const actorID = player.currentTarget.id
      const newList = this.activePlayers.filter(actor => actor !== actorID)

      this.updateActors("replace", newList)
    }

    // Checks if the actors still exist; if they were deleted, then remove them from the list
    isActorAlive(actorID){
      const actor = fromUuidSync(actorID)

      // If the actor is dead, update the variables
      if(actor){
        // Actor is alive, continue
        return true
      } else {
        // Actor is dead, rewrite some variables
        const newPlayersList = this.activePlayers.filter((players) => players !== actorID)

        // Update players list
        this.updateActors("replace", newPlayersList)

        // Continue
        return false
      }
    }
}
