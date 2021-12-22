export class SceneNotes extends FormApplication {
  // Modify the defaults
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["form"],
      title: "Scene Notes",
      id: "scenenotes",
      template: "modules/cofdutils/templates/scenenotes.hbs",
      width: 800,
      height: 555,
      resizable: true,
      minimizable: true,
      closeOnSubmit: false,
      submitOnChange: true,
      dragDrop: [{
        dragSelector: ".entity.actor",
        dropSelector: null
      }]
    })
  }

  // Set initial data for the template
  constructor() {
    super()

    this.data = game.settings.get("cofdutils", "scenenotes-data")
    this.activeScene = game.settings.get("cofdutils", "scenenotes-activescene")
  }

  // Send data to the template
  getData() {
    if(this.activeScene){
      const scene = this.data.scenes.find(scene => scene.id == this.activeScene)

      const data = {
        activeScene: this.activeScene,
        scenes: this.data.scenes,
        actors: [],
        journals: [],
        items: [],
        activeSceneData: this.data.scenes.find(scene => scene.id == this.activeScene)
      }

      // Re-render the actor's data each time the data is called for
      if(scene.actors){
        scene.actors.forEach(actorID => {
          // Get the actor's sheet
          const player = game.actors.get(actorID)

          // Push only the data we need and format it nicely for Handlebar rendering
          data.actors.push({
            id: player.id,
            img: player.data.img,
            name: player.data.name
          })
        })
      }

      // Re-render the journal's data each time the data is called for
      if(scene.journals){
        scene.journals.forEach(journalID => {
          // Get the actor's sheet
          const journal = game.journal.get(journalID)

          // Push only the data we need and format it nicely for Handlebar rendering
          data.journals.push({
            id: journal.id,
            img: "/icons/svg/book.svg",
            name: journal.data.name
          })
        })
      }

      // Re-render the journal's data each time the data is called for
      if(scene.items){
        scene.items.forEach(itemID => {
          // Get the actor's sheet
          const item = game.items.get(itemID)

          // Push only the data we need and format it nicely for Handlebar rendering
          data.items.push({
            id: item.id,
            img: item.data.img,
            name: item.data.name
          })
        })
      }

      return data
    } else {
      const data = {
        activeScene: null,
        scenes: [],
        actors: [],
        journals: [],
        items: [],
        activeSceneData: {}
      }

      return data
    }
  }

  // When the form is updated, re-render the template
  _updateObject(event, formData) {
    this.updateData({ formData: formData })

    return formData
  }

  // Listeners for when the sheet is opened
  activateListeners(html) {
    super.activateListeners(html)

    // Tie functions to buttons
    html.find("#newScene").click(this._newScene.bind(this))
    html.find(".scene").click(this._changeScene.bind(this))
    html.find(".actorsList .actor").click(this._openSheet.bind(this))
    html.find(".actorsList .actor").contextmenu(this._removeActor.bind(this))
    html.find(".journals .journal").click(this._openJournal.bind(this))
    html.find(".journals .journal").contextmenu(this._removeJournal.bind(this))
    html.find(".items .item").click(this._openItem.bind(this))
    html.find(".items .item").contextmenu(this._removeItem.bind(this))
    html.find("#editSceneName").click(this._changeSceneName.bind(this))
    html.find("#deleteScene").click(this._deleteScene.bind(this))
  }

  // Response to an entity being dropped onto the page
  _onDrop(event) {
    let data

    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'))
    }
    catch (err) {
      return false
    }


    if (data.type == 'Actor') {
      // Data variables
      const newActor = data.id
      const sceneIndex = this.data.scenes.findIndex(scene => scene.id == this.activeScene)
      let actorData = this.data.scenes[sceneIndex].actors

      // Check if the actor is already in the list
      const actorUniqueCheck = actorData.find(actor => actor == newActor)

      // if the actor is unique, push it to the list and update the data
      if(!actorUniqueCheck){
        actorData.push(newActor)

        this.updateData({ actors: actorData })
      }
    }

    if (data.type == 'JournalEntry') {
      // Data variables
      const newJournal = data.id

      const sceneIndex = this.data.scenes.findIndex(scene => scene.id == this.activeScene)
      let journalData = this.data.scenes[sceneIndex].journals

      // Check if the journal is already in the list
      const journalUniqueCheck = journalData.find(journal => journal == newJournal)

      // if the journal ID is unique, push it to the list and update the data
      if(!journalUniqueCheck){
        journalData.push(newJournal)

        this.updateData({ journals: journalData })
      }
    }

    if (data.type == 'Item') {
      // Data variables
      const newItem = data.id

      const sceneIndex = this.data.scenes.findIndex(scene => scene.id == this.activeScene)
      let itemData = this.data.scenes[sceneIndex].items

      // Check if the item is already in the list
      const itemUniqueCheck = itemData.find(item => item == newItem)

      // if the item ID is unique, push it to the list and update the data
      if(!itemUniqueCheck){
        itemData.push(newItem)

        this.updateData({ items: itemData })
      }
    }
  }

  // Alter the name of the scene
  _changeSceneName () {
    let sceneName = this.data.scenes.find(scene => scene.id == this.activeScene).name

    // Generate a new dialogue to change the name
    let d = new Dialog({
     title: `${game.i18n.localize("CofD.SceneNotes.editNameTitle")} ${sceneName}`,
     content: `
      <form>
        <div class="form-group changeName">
          <div>
            <label>${game.i18n.localize("CofD.SceneNotes.editNameDesc")}</label>
            <input type="text" id="newName" value="${sceneName}"/>
          </div>
        </div>
      </form>`,
     buttons: {
       submit: {
         icon: '<i class="fas fa-check"></i>',
         label: `${game.i18n.localize("CofD.submit")}`,
         callback: (html) => {
           // Define the new number of beats, and force it to be a number
           const newName = html.find('#newName')[0].value

           // Update the scene name on submit
           this.updateData({ name: newName })
         }
       },
       cancel: {
         icon: '<i class="fas fa-times"></i>',
         label: game.i18n.localize("CofD.cancel")
       }
     },
     default: "submit"
    })

    // Render the dialogue
    d.render(true)
  }

  // Alter the name of the scene
  _deleteScene () {
    let sceneName = this.data.scenes.find(scene => scene.id == this.activeScene).name

    // Generate a new dialogue to change the name
    let d = new Dialog({
     title: `${game.i18n.localize("CofD.SceneNotes.deleteSceneTitle")} ${sceneName}`,
     content: `
      <form>
        <div class="form-group deleteScene">
          <div>
            <label>${game.i18n.localize("CofD.SceneNotes.deleteSceneDesc")}</label>
          </div>
        </div>
      </form>`,
     buttons: {
       submit: {
         icon: '<i class="fas fa-check"></i>',
         label: `${game.i18n.localize("CofD.confirm")}`,
         callback: () => {
           // Filter out the scene and delete it
           this.data.scenes = this.data.scenes.filter(scene => scene.id !== this.activeScene)
           game.settings.set("cofdutils", "scenenotes-data", this.data)

           if(this.data.scenes.length > 0){
             // if there is still at least 1 scene in the list, then swap to the first in the list
             this.activeScene = this.data.scenes[0].id

             // Update it in the settings
             game.settings.set("cofdutils", "scenenotes-activescene", this.data.scenes[0].id)
           } else {
             // Otherwise, there is no scene to swap to, and set it to null
             this.activeScene = null

             // Update it in the settings
             game.settings.set("cofdutils", "scenenotes-activescene", null)
           }

           this.render()
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

  // Open a sheet
  _openSheet (event) {
    // Get Actor ID
    const actorID = event.currentTarget.id

    // Open the sheet with the relevant ID
    game.actors.get(actorID).sheet.render(true)
  }

  // Remove an actor from a scene's list
  _removeActor (event) {
    const actorID = event.currentTarget.id

    // Find the actors list for the current scene
    const sceneActors = this.data.scenes.find(scene => scene.id == this.activeScene).actors

    // Filter out the item with the ID, and then update the list
    this.updateData({ actors: sceneActors.filter((actor) => actor !== actorID) })
  }

  // Open a journal
  _openJournal (event) {
    // Get journal ID
    const journalID = event.currentTarget.id

    // Open the sheet with the relevant ID
    game.journal.get(journalID).sheet.render(true)
  }

  // Remove a journal from a scene's list
  _removeJournal (event) {
    const journalID = event.currentTarget.id

    // Find the journals list for the current scene
    const sceneJournals = this.data.scenes.find(scene => scene.id == this.activeScene).journals

    // Filter out the journal with the ID, and then update the list
    this.updateData({ journals: sceneJournals.filter((journal) => journal !== journalID) })
  }

  // Open an item
  _openItem (event) {
    // Get item ID
    const itemID = event.currentTarget.id

    // Open the sheet with the relevant ID
    game.items.get(itemID).sheet.render(true)
  }

  // Remove a journal from a scene's list
  _removeItem (event) {
    // Get the item ID to remove
    const itemID = event.currentTarget.id

    // Find the items list for the current scene
    const sceneItems = this.data.scenes.find(scene => scene.id == this.activeScene).items

    // Filter out the item with the ID, and then update the list
    this.updateData({ items: sceneItems.filter((item) => item !== itemID) })
  }

  _newScene() {
    const uniqueID = Date.now() // Use the timestamp in order to generate a unique identifier

    const newScene = {
      id: `${uniqueID}`,
      name: `${game.i18n.localize("CofD.SceneNotes.newScene")}`,
      actors: [],
      journals: [],
      items: [],
      formData: {}
    }

    this.data.scenes.push(newScene)

    game.settings.set("cofdutils", "scenenotes-data", this.data)
    game.settings.set("cofdutils", "scenenotes-activescene", `${uniqueID}`)
    this.activeScene = `${uniqueID}`

    this.render()
  }

  _changeScene(event) {
    const sceneID = event.currentTarget.id

    game.settings.set("cofdutils", "scenenotes-activescene", sceneID)
    this.activeScene = sceneID

    this.render()
  }

  updateData(newData) {
    // Get the currently active scene
    const sceneIndex = this.data.scenes.findIndex(scene => scene.id == this.activeScene)

    // Grab the data from that scene
    const sceneData = this.data.scenes[sceneIndex]

    // Loop through properties and add in new data
    for(let property in newData) {
      if(newData.hasOwnProperty(property)) {
        sceneData[property] = newData[property];
      }
    }

    // Update it in the settings
    game.settings.set("cofdutils", "scenenotes-data", this.data)

    this.render()
  }
}
