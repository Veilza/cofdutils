import { GroupBeats } from './group-beats/groupbeats.js'

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
