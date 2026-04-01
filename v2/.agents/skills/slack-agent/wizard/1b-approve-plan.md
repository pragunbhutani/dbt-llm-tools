# Phase 1b: Approve Implementation Plan

This phase presents the generated implementation plan to the user for review and approval before proceeding with project setup.

## Prerequisites

You should have:
- Completed Step 1.1 (Understand Agent Purpose)
- Generated a custom implementation plan in Step 1.2

---

## Present the Plan

Display the generated implementation plan to the user in a clear, organized format:

> **Here's my proposed implementation plan for your [Agent Name]:**
>
> [Display the full generated plan from Step 1.2]
>
> **Complexity:** [Simple/Medium/Complex]

---

## Request User Decision

After presenting the plan, ask the user to choose how to proceed:

> **What would you like to do?**
>
> 1. **Approve and continue** - Proceed with this plan
> 2. **Modify the plan** - Tell me what to change
> 3. **Start over** - Describe your agent differently

---

## Handle User Response

### If User Approves

Store the approved plan for reference throughout the remaining phases:

1. **Note the key elements** that will be implemented:
   - Slash commands to create
   - AI tools to build
   - Event handlers to set up
   - State management approach
   - Block Kit UI elements

2. **Return to Phase 1** to continue with:
   - [Step 1.3: Choose LLM Provider](./1-project-setup.md#step-13-choose-llm-provider-if-using-ai)
   - [Step 1.4: Clone the Template](./1-project-setup.md#step-14-clone-the-template)

3. **The approved plan guides implementation** in later phases:
   - Phase 2: Manifest will include the specified slash commands
   - Phase 3+: Build the features specified in the plan

### If User Wants Modifications

Ask clarifying questions about what to change:

> **What would you like to change?**
>
> You can:
> - Add or remove features
> - Change slash command names
> - Adjust AI capabilities
> - Modify the state management approach
> - Change any other aspect of the plan

After receiving feedback:

1. Update the plan based on their input
2. Present the revised plan
3. Ask for approval again

**Common modification requests:**

| User says... | How to modify |
|-------------|---------------|
| "Add a command for X" | Add to Slash Commands table |
| "I don't need X feature" | Remove from Core Features |
| "Make it simpler" | Reduce scope, mark as lower complexity |
| "Add AI for Y" | Add to AI Tools, update State Management if needed |
| "I need to store data" | Update State Management to include database |

### If User Wants to Start Over

Return to [Step 1.1: Understand the Agent Purpose](./1-project-setup.md#step-11-understand-the-agent-purpose) and ask them to describe their agent differently.

---

## Plan Refinement Tips

When modifying plans based on user feedback:

1. **Keep it focused** - Only include features the user explicitly wants
2. **Be specific** - Use concrete names for commands and tools
3. **Consider dependencies** - If they want feature X, they might also need Y
4. **Right-size complexity** - Don't over-engineer simple bots

**Example refinement conversation:**

> User: "I want a weather bot but simpler - just current weather, no forecast"
>
> Assistant: "Got it! Here's a simplified plan..."
>
> ```
> ## Implementation Plan: Weather Bot (Simplified)
>
> ### Overview
> A simple bot that provides current weather for any location.
>
> ### Core Features
> 1. **Current Weather** - Get current conditions for a location
>
> ### Slash Commands
> | Command | Description | Example |
> |---------|-------------|---------|
> | `/weather` | Get current weather | `/weather San Francisco` |
>
> ### Complexity: Simple
> ```

---

## Context to Store

After approval, maintain these details for use in later phases:

| Context | Used In |
|---------|---------|
| Slash command names | Phase 2 (manifest.json) |
| Bot scopes needed | Phase 2 (manifest.json) |
| AI usage decision | Phase 1 (Step 1.3), Phase 3 (.env) |
| State management approach | Phase 3+, implementation |
| Feature list | Implementation reference |

---

## Next Phase

After the plan is approved, return to [Phase 1: Project Setup](./1-project-setup.md) to continue with:
- Step 1.3: Choose LLM Provider
- Step 1.4: Scaffold the Project

Then proceed to [Phase 2: Create Slack App](./2-create-slack-app.md).
