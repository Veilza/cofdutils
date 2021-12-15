// GroupBeats module constructor
import { GroupBeats } from './group-beats/groupbeats.js'

// Combat Selector module
import('./combat-selector/combatselector.js')

// Register module settings
Hooks.on("ready", () => {
  // For storing the current number of beats
  game.settings.register("cofdutils", "groupbeats-currentBeats", {
    name: "Current Beats",
    scope: "world",
    config: false,
    default: 0,
    type: Number
  })
  // For storing the players list
  game.settings.register("cofdutils", "groupbeats-activePlayers", {
    name: "Players",
    scope: "world",
    config: false,
    default: [],
    type: Array
  })
  // For storing the targeting defense penalty
  game.settings.register("cofdutils", "combatselector-penalty", {
    name: "Defense Penalty",
    scope: "client",
    config: false,
    default: 0,
    type: Number
  })
  // Automatically remove targeted actor's defense from combat rolls
  game.settings.register("cofdutils", "combatselector-automatedDefense", {
    name: "Automatic Defense",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  })
})

// Generate the button(s)
Hooks.on("getSceneControlButtons", (controls) => {  
  // Simple way to locate the token controls
  let tokenControls = controls.find(c => c.name === "token" )
  
  // Push the button to the token controls
  if(tokenControls && tokenControls.hasOwnProperty('tools')){
    tokenControls.tools.push({
      name: "beats",
      title: "Group Beats",
      icon: "fas fa-book",
      button: true,
      visible: game.user.isGM, // Only show this button to the GM
      onClick: () => new GroupBeats().render(true) // Function to pop the beats menu up
    })
  }
})

// Handle actor updates
Hooks.on("updateActor", (actor) => {
  // Some variables
  const actorID = actor.id
  const activePlayers = game.settings.get("cofdutils", "groupbeats-activePlayers")
  
  // If the actor is in the active players list...
  if(activePlayers.find(players => players == actorID)){
        
    // Re-render the GroupBeats menu
    Object.values(ui.windows).find(windows => windows.id == "groupbeats").render()
  }
})
