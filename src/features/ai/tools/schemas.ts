export const aiTools = [
  {
    type: "function",
    function: {
      name: "create_routine",
      description: "Creates a new workout routine.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          date: { type: "string", description: "ISO date string (e.g. YYYY-MM-DD)" },
          exercises: { type: "array", items: { type: "object", properties: { name: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, target_muscle: { type: "string" } }, required: ["name", "sets", "reps", "target_muscle"], additionalProperties: false } }
        },
        required: ["name", "date", "exercises"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_exercise",
      description: "Creates a new custom exercise.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          muscleGroup: { type: "string" },
          type: { type: "string", description: "strength, cardio, or mobility" },
          equipment: { type: "string" }
        },
        required: ["name", "muscleGroup", "type", "equipment"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_macros",
      description: "Updates the user's daily macro goals.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fats: { type: "number" }
        },
        required: ["calories", "protein", "carbs", "fats"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_workout_history",
      description: "Fetches the user's logged workouts over the specified number of days.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to analyze (default 30)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_adaptive_tdee",
      description: "Calculates the user's true Adaptive TDEE using thermodynamic analysis over the last 21-30 days of weigh-ins and calories. DO NOT ask the user before calling this tool, just call it.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_weigh_ins",
      description: "Fetches the user's weigh-in history (body weight).",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "Number of most recent weigh-ins to fetch" } },
        required: ["days"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_saved_routines",
      description: "Fetches the user's saved workout routines.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "modify_saved_routine",
      description: "Modifies a saved workout routine by reordering, adding, or removing exercises.",
      parameters: {
        type: "object",
        properties: {
          routine_name: { type: "string", description: "The exact name of the routine to modify." },
          exercises: { type: "array", items: { type: "string" }, description: "An ordered list of exact exercise names." }
        },
        required: ["routine_name", "exercises"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_active_workout",
      description: "Modifies the user's LIVE active workout. Use for 'condense', 'swap', or 'add/remove'. Provide the FULL list of ALL exercises.",
      parameters: {
        type: "object",
        properties: {
          exercises: { type: "array", items: { type: "string" }, description: "Ordered list of exact exercise names. No metadata tags." },
          preserve_omitted_exercises: { type: "boolean", description: "Set true to keep omitted exercises. Set false only if user asked to delete." }
        },
        required: ["exercises", "preserve_omitted_exercises"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "sort_active_workout",
      description: "Sorts the user's LIVE workout by exercise type. Use when asked to 'move compound to top', 'sort by compound first', or 'prioritize compound lifts'. Deterministic sort — all sets preserved.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["compound_first", "isolation_first"], description: "Sort order." }
        },
        required: ["sort_by"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "filter_active_workout",
      description: "Filters out exercises from the user's LIVE workout based on their spinal risk profile. Use this when the user asks to 'remove spine risk exercises', 'filter out dangerous lifts', or 'remove spinal shear'. Deterministic filter — reads database metadata automatically.",
      parameters: {
        type: "object",
        properties: {
          remove_risk: { type: "string", description: "The exact risk category to remove, e.g., 'Spinal Shear / Flexion' or 'High Risk'." }
        },
        required: ["remove_risk"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_exercise_library",
      description: "Fetches the user's exercise library with muscle groups and movement types.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "search_exercise_knowledge",
      description: "Searches the Exercise Knowledge Base for how to perform an exercise, muscles targeted, common mistakes, and video links.",
      parameters: {
        type: "object",
        properties: {
          exercise_name: { type: "string", description: "The exact name of the exercise." }
        },
        required: ["exercise_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_custom_macros",
      description: "Calculates macro splits for a custom calorie target.",
      parameters: {
        type: "object",
        properties: {
          target_calories: { type: "number", description: "The total calorie target." }
        },
        required: ["target_calories"]
      }
    }
  }
];
