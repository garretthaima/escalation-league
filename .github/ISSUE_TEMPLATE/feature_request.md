name: Feature Request
description: Suggest a new feature or improvement
title: "[Feature]: "
labels: [enhancement]
assignees: ''

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to suggest a feature! Please provide as much detail as possible to help us understand your idea.

  - type: input
    id: context
    attributes:
      label: Related Context
      description: Is this related to a specific problem or use case?
      placeholder: ex. "It would be helpful if I could..."
    validations:
      required: false

  - type: textarea
    id: feature-description
    attributes:
      label: Feature Description
      description: Describe the feature or improvement you'd like to see.
      placeholder: A clear and concise description of the feature.
    validations:
      required: true

  - type: textarea
    id: solution-idea
    attributes:
      label: Proposed Solution
      description: If you have ideas for how to implement it, describe them here.
    validations:
      required: false

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Have you considered alternative solutions or workarounds?
    validations:
      required: false

  - type: textarea
    id: additional-info
    attributes:
      label: Additional Context
      description: Add any other context or screenshots that help explain your request.
      validations:
      required: false
