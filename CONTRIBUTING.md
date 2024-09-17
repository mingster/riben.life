# Contributing

Thank you for considering contributing! This document will outline how to submit changes to this repository and which conventions to follow. If you are ever in doubt about anything we encourage you to reach out either by submitting an issue here.

### Important
Our core maintainers prioritize pull requests (PRs) from within our organization. External contributions are regularly triaged, but not at any fixed cadence. It varies depending on how busy the maintainers are. This is applicable to all types of PRs, so we kindly ask for your patience.

If you, as a community contributor, wish to work on more extensive features, please reach out to CODEOWNERS instead of directly submitting a PR with all the changes. This approach saves us both time, especially if the PR is not accepted (which will be the case if it does not align with our roadmap), and helps us effectively review and evaluate your contribution if it is accepted.

## Prerequisites

- **You're familiar with GitHub Issues and Pull Requests**
- **You've read the [mark down docs]().**
- **You've setup a test project**

## Issues before PRs

1. Before you start working on a change please make sure that there is an issue for what you will be working on. You can either find and [existing issue]https://github.com/mingster/legod.org/issues) or [open a new issue](https://github.com/mingster/legod.org/issues/new) if none exists. Doing this makes sure that others can contribute with thoughts or suggest alternatives, ultimately making sure that we only add changes that make

2. When you are ready to start working on a change you should first [fork this repo](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) and [branch out](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-and-deleting-branches-within-your-repository) from the `develop` branch.
3. Make your changes.
4. [Open a pull request towards the develop branch in this repo](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork). Within a couple of days a team member will review, comment and eventually approve your PR.

## Workflow

### Branches

All changes should be part of a branch and submitted as a pull request - your branches should be prefixed with one of:

- `fix/` for bug fixes
- `feat/` for features
- `docs/` for documentation changes

### Commits

Strive towards keeping your commits small and isolated - this helps the reviewer understand what is going on and makes it easier to process your requests.

### Pull Requests

Once your changes are ready you must submit your branch as a pull request. Your pull request should be opened against the `develop` branch.

In your PR's description you should follow the structure:

- **What** - what changes are in this PR
- **Why** - why are these changes relevant
- **How** - how have the changes been implemented
- **Testing** - how has the changes been tested or how can the reviewer test the feature

We highly encourage that you do a self-review prior to requesting a review. To do a self review click the review button in the top right corner, go through your code and annotate your changes. This makes it easier for the reviewer to process your PR.

#### Pull Request (PR) Checklist

- Type of PR: Indicate the type of PR by adding a label in square brackets at the beginning of the title, such as

  | command       | example                                         |
  | :------------ | :---------------------------------------------- |
  | [BugFix]      | [fix]/restore the missing pizza-12345        |
  | [Feature]     | [feat]/add a new pizza-12346                 |
  | [Enhancement] | [enhancement]/add new topping to pizza #1-12347 |
  | [Refactor]    | [refactor]/move cheese to the top-12348         |
  | [Doc]         | [docs]/writeup recipe for #1-12349               |

- Short Description: Provide a brief, informative description of the PR that explains the changes made.
- Issue(s) Linked: Mention any related issue(s) by using the keyword Fixes or Closes followed by the respective issue number(s) (e.g., Fixes #123, Closes #456).
- Branch: Ensure that you have created a new branch for the changes, and it is based on the latest version of the main branch.
- Code Changes: Make sure the code changes are minimal, focused, and relevant to the issue or feature being addressed.
- Commit Messages: Write clear and concise commit messages that explain the purpose of each commit.
- Tests: Include unit tests and/or integration tests for any new code or changes to existing code. Make sure all tests pass before submitting the PR.
- Documentation: Update relevant documentation (e.g., README, inline comments, or external documentation) to reflect any changes made.
- Review Requested: Request a review from at least one other contributor or maintainer of the repository.
- Video Submission (For Complex/Large PRs): If your PR introduces significant changes, complexities, or a large number of lines of code, submit a brief video walkthrough along with the PR. The video should explain the purpose of the changes, the logic behind them, and how they address the issue or add the proposed feature. This will help reviewers to better understand your contribution and expedite the review process.

### Pull Request Naming Convention

Use the following naming convention for your PR branches:

```
<type>/<short-description>-<issue-number>
```

- `<type>`: The type of PR, such as bugfix, feature, enhancement, refactor, or docs. Multiple types are ok and should appear as ,
- `<short-description>`: A brief description of the changes made, using hyphens to separate words.
- `<issue-number>`: The issue number associated with the changes made (if applicable).

Example:

```
[Feature]/advanced-chunking-strategy-123

```


#### Merge Style

All pull requests are squashed and merged.

### Testing

All PRs should include tests for the changes that are included. We have two types of tests that must be written:

- **Unit tests** found under `packages/*/src/services/__tests__` and `packages/*/src/api/routes/*/__tests__`
- **Integration tests** found in `integration-tests/*/__tests__`

Check out our [local development documentation]() to learn how to test your changes both in the  repository and in a local server.

### Documentation

- We generally encourage to document your changes through comments in your code.
- If you alter user-facing behaviour you must provide documentation for such changes.
- All methods and endpoints should be documented using [JSDoc](https://jsdoc.app/) and [`swagger-inline`](https://www.npmjs.com/package/swagger-inline)

### Release

Our team will regularly create releases from the develop branch.





