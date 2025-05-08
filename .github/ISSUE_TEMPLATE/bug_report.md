name: Bug Report
description: File a bug/issue with the current behavior
title: "[Bug]: "
labels: [bug]
assignees: ''

body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug! Please fill out the form below so we can help you as quickly as possible.

  - type: input
    id: environment
    attributes:
      label: Environment
      description: What platform, version, or environment are you using?
      placeholder: ex. Node.js 20 on macOS, or Chrome 124 on Windows 11
    validations:
      required: true

  - type: textarea
    id: steps-to-reproduce
    attributes:
      label: Steps to Reproduce
      description: Provide the exact steps to reproduce the issue.
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. Scroll down to '...'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
    validations:
      required: true

  - type: textarea
    id: actual-behavior
    attributes:
      label: Actual Behavior
      description: What actually happened?
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Relevant Logs or Screenshots
      description: Add logs or screenshots if available.
      render: shell
