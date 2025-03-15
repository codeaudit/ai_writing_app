---
id: doc-ui-test-composition-templates
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
versions:
  - id: ver-ui-test-composition-templates-initial
    createdAt: '2025-03-15T19:30:00.000Z'
    message: Initial version
tags:
  - composition
  - templates
  - structure
  - testing
---

# Composition Templates Test

This document tests how the UI handles composition templates, which define the structure and default content for new compositions.

## Basic Composition Template

```yaml
id: template-basic-article
name: Basic Article Template
description: A simple article template with standard sections
version: 1.0.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
structure:
  - id: section-title
    type: heading
    level: 1
    content: "{{title}}"
    required: true
  - id: section-abstract
    type: paragraph
    content: "{{abstract}}"
    placeholder: "Write a brief summary of your article here..."
    required: true
  - id: section-introduction
    type: heading
    level: 2
    content: "Introduction"
    required: true
  - id: section-introduction-content
    type: paragraph
    content: "{{introduction}}"
    placeholder: "Introduce your topic and provide context..."
    required: true
  - id: section-body
    type: heading
    level: 2
    content: "Main Content"
    required: true
  - id: section-body-content
    type: paragraph
    content: "{{body}}"
    placeholder: "Develop your main arguments or points here..."
    required: true
  - id: section-conclusion
    type: heading
    level: 2
    content: "Conclusion"
    required: true
  - id: section-conclusion-content
    type: paragraph
    content: "{{conclusion}}"
    placeholder: "Summarize your key points and provide closing thoughts..."
    required: true
  - id: section-references
    type: heading
    level: 2
    content: "References"
    required: false
  - id: section-references-content
    type: list
    listType: ordered
    content: "{{references}}"
    placeholder: "List your references here..."
    required: false
defaultValues:
  title: "Untitled Article"
  abstract: ""
  introduction: ""
  body: ""
  conclusion: ""
  references: []
```

## Advanced Composition Template with Nested Sections

```yaml
id: template-research-paper
name: Research Paper Template
description: A comprehensive template for academic research papers
version: 2.1.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
structure:
  - id: section-title
    type: heading
    level: 1
    content: "{{title}}"
    required: true
  - id: section-authors
    type: paragraph
    content: "{{authors}}"
    placeholder: "Author names and affiliations..."
    required: true
  - id: section-abstract
    type: heading
    level: 2
    content: "Abstract"
    required: true
  - id: section-abstract-content
    type: paragraph
    content: "{{abstract}}"
    placeholder: "Summarize your research in 150-250 words..."
    required: true
    maxLength: 1500
  - id: section-keywords
    type: paragraph
    content: "**Keywords:** {{keywords}}"
    placeholder: "List 4-6 keywords separated by commas..."
    required: true
  - id: section-introduction
    type: heading
    level: 2
    content: "1. Introduction"
    required: true
  - id: section-introduction-content
    type: paragraph
    content: "{{introduction}}"
    placeholder: "Introduce your research topic, context, and objectives..."
    required: true
  - id: section-literature-review
    type: heading
    level: 2
    content: "2. Literature Review"
    required: true
  - id: section-literature-review-content
    type: paragraph
    content: "{{literatureReview}}"
    placeholder: "Review relevant previous research and theoretical framework..."
    required: true
  - id: section-methodology
    type: heading
    level: 2
    content: "3. Methodology"
    required: true
    children:
      - id: section-methodology-participants
        type: heading
        level: 3
        content: "3.1 Participants"
        required: true
      - id: section-methodology-participants-content
        type: paragraph
        content: "{{participants}}"
        placeholder: "Describe the participants in your study..."
        required: true
      - id: section-methodology-materials
        type: heading
        level: 3
        content: "3.2 Materials"
        required: true
      - id: section-methodology-materials-content
        type: paragraph
        content: "{{materials}}"
        placeholder: "Describe the materials used in your study..."
        required: true
      - id: section-methodology-procedure
        type: heading
        level: 3
        content: "3.3 Procedure"
        required: true
      - id: section-methodology-procedure-content
        type: paragraph
        content: "{{procedure}}"
        placeholder: "Describe the procedure followed in your study..."
        required: true
      - id: section-methodology-analysis
        type: heading
        level: 3
        content: "3.4 Data Analysis"
        required: true
      - id: section-methodology-analysis-content
        type: paragraph
        content: "{{dataAnalysis}}"
        placeholder: "Describe your data analysis methods..."
        required: true
  - id: section-results
    type: heading
    level: 2
    content: "4. Results"
    required: true
  - id: section-results-content
    type: paragraph
    content: "{{results}}"
    placeholder: "Present your findings without interpretation..."
    required: true
  - id: section-discussion
    type: heading
    level: 2
    content: "5. Discussion"
    required: true
  - id: section-discussion-content
    type: paragraph
    content: "{{discussion}}"
    placeholder: "Interpret your results and relate them to previous research..."
    required: true
  - id: section-conclusion
    type: heading
    level: 2
    content: "6. Conclusion"
    required: true
  - id: section-conclusion-content
    type: paragraph
    content: "{{conclusion}}"
    placeholder: "Summarize your findings, implications, and suggestions for future research..."
    required: true
  - id: section-references
    type: heading
    level: 2
    content: "References"
    required: true
  - id: section-references-content
    type: custom
    contentType: "references"
    content: "{{references}}"
    placeholder: "List your references in APA format..."
    required: true
  - id: section-appendices
    type: heading
    level: 2
    content: "Appendices"
    required: false
  - id: section-appendices-content
    type: custom
    contentType: "appendices"
    content: "{{appendices}}"
    placeholder: "Include any supplementary materials here..."
    required: false
defaultValues:
  title: "Untitled Research Paper"
  authors: ""
  abstract: ""
  keywords: ""
  introduction: ""
  literatureReview: ""
  participants: ""
  materials: ""
  procedure: ""
  dataAnalysis: ""
  results: ""
  discussion: ""
  conclusion: ""
  references: []
  appendices: []
metadata:
  citationStyle: "APA"
  wordCount: 0
  targetJournal: ""
  submissionDeadline: ""
  reviewStatus: "Draft"
```

## Creative Writing Template with Branching Structure

```yaml
id: template-short-story
name: Short Story Template
description: A template for creative short stories with character and plot development
version: 1.5.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
structure:
  - id: section-title
    type: heading
    level: 1
    content: "{{title}}"
    required: true
  - id: section-author
    type: paragraph
    content: "By {{author}}"
    required: true
  - id: section-character-profiles
    type: custom
    contentType: "characterProfiles"
    content: "{{characterProfiles}}"
    visible: false
    required: false
  - id: section-plot-outline
    type: custom
    contentType: "plotOutline"
    content: "{{plotOutline}}"
    visible: false
    required: false
  - id: section-setting-description
    type: custom
    contentType: "settingDescription"
    content: "{{settingDescription}}"
    visible: false
    required: false
  - id: section-introduction
    type: heading
    level: 2
    content: "Introduction"
    required: true
  - id: section-introduction-content
    type: paragraph
    content: "{{introduction}}"
    placeholder: "Set the scene and introduce your main character(s)..."
    required: true
  - id: section-rising-action
    type: heading
    level: 2
    content: "Rising Action"
    required: true
  - id: section-rising-action-content
    type: paragraph
    content: "{{risingAction}}"
    placeholder: "Develop the conflict and build tension..."
    required: true
  - id: section-climax
    type: heading
    level: 2
    content: "Climax"
    required: true
  - id: section-climax-content
    type: paragraph
    content: "{{climax}}"
    placeholder: "Present the turning point of your story..."
    required: true
  - id: section-falling-action
    type: heading
    level: 2
    content: "Falling Action"
    required: true
  - id: section-falling-action-content
    type: paragraph
    content: "{{fallingAction}}"
    placeholder: "Show the consequences of the climax..."
    required: true
  - id: section-resolution
    type: heading
    level: 2
    content: "Resolution"
    required: true
  - id: section-resolution-content
    type: paragraph
    content: "{{resolution}}"
    placeholder: "Conclude your story and tie up loose ends..."
    required: true
  - id: section-alternate-endings
    type: heading
    level: 2
    content: "Alternate Endings (Optional)"
    required: false
    conditional:
      field: "hasAlternateEndings"
      value: true
  - id: section-alternate-ending-1
    type: heading
    level: 3
    content: "Alternate Ending 1"
    required: false
    conditional:
      field: "hasAlternateEndings"
      value: true
  - id: section-alternate-ending-1-content
    type: paragraph
    content: "{{alternateEnding1}}"
    placeholder: "Describe an alternative resolution to your story..."
    required: false
    conditional:
      field: "hasAlternateEndings"
      value: true
  - id: section-alternate-ending-2
    type: heading
    level: 3
    content: "Alternate Ending 2"
    required: false
    conditional:
      field: "hasAlternateEndings"
      value: true
  - id: section-alternate-ending-2-content
    type: paragraph
    content: "{{alternateEnding2}}"
    placeholder: "Describe another alternative resolution to your story..."
    required: false
    conditional:
      field: "hasAlternateEndings"
      value: true
defaultValues:
  title: "Untitled Short Story"
  author: ""
  characterProfiles: []
  plotOutline: ""
  settingDescription: ""
  introduction: ""
  risingAction: ""
  climax: ""
  fallingAction: ""
  resolution: ""
  hasAlternateEndings: false
  alternateEnding1: ""
  alternateEnding2: ""
metadata:
  genre: ""
  targetWordCount: 2500
  targetAudience: ""
  themes: []
  pointOfView: "Third Person"
```

## Business Document Template with Dynamic Sections

```yaml
id: template-business-proposal
name: Business Proposal Template
description: A comprehensive template for business proposals with customizable sections
version: 3.0.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
structure:
  - id: section-title-page
    type: custom
    contentType: "titlePage"
    content: {
      "title": "{{title}}",
      "subtitle": "{{subtitle}}",
      "companyName": "{{companyName}}",
      "companyLogo": "{{companyLogo}}",
      "preparedFor": "{{clientName}}",
      "preparedBy": "{{authorName}}",
      "date": "{{date}}",
      "confidentiality": "{{confidentiality}}"
    }
    required: true
  - id: section-executive-summary
    type: heading
    level: 1
    content: "Executive Summary"
    required: true
  - id: section-executive-summary-content
    type: paragraph
    content: "{{executiveSummary}}"
    placeholder: "Provide a brief overview of the proposal (1-2 paragraphs)..."
    required: true
    maxLength: 2000
  - id: section-company-profile
    type: heading
    level: 1
    content: "Company Profile"
    required: true
    conditional:
      field: "includeCompanyProfile"
      value: true
  - id: section-company-profile-content
    type: paragraph
    content: "{{companyProfile}}"
    placeholder: "Describe your company, history, mission, and relevant experience..."
    required: true
    conditional:
      field: "includeCompanyProfile"
      value: true
  - id: section-problem-statement
    type: heading
    level: 1
    content: "Problem Statement"
    required: true
  - id: section-problem-statement-content
    type: paragraph
    content: "{{problemStatement}}"
    placeholder: "Clearly define the problem or need this proposal addresses..."
    required: true
  - id: section-proposed-solution
    type: heading
    level: 1
    content: "Proposed Solution"
    required: true
  - id: section-proposed-solution-content
    type: paragraph
    content: "{{proposedSolution}}"
    placeholder: "Describe your proposed solution in detail..."
    required: true
  - id: section-methodology
    type: heading
    level: 1
    content: "Methodology"
    required: true
    conditional:
      field: "includeMethodology"
      value: true
  - id: section-methodology-content
    type: paragraph
    content: "{{methodology}}"
    placeholder: "Explain your approach and methods for implementing the solution..."
    required: true
    conditional:
      field: "includeMethodology"
      value: true
  - id: section-timeline
    type: heading
    level: 1
    content: "Timeline"
    required: true
  - id: section-timeline-content
    type: custom
    contentType: "timeline"
    content: "{{timeline}}"
    placeholder: "Outline the project schedule with key milestones and deliverables..."
    required: true
  - id: section-budget
    type: heading
    level: 1
    content: "Budget"
    required: true
  - id: section-budget-content
    type: custom
    contentType: "budget"
    content: "{{budget}}"
    placeholder: "Provide a detailed breakdown of costs..."
    required: true
  - id: section-team
    type: heading
    level: 1
    content: "Team"
    required: false
    conditional:
      field: "includeTeam"
      value: true
  - id: section-team-content
    type: custom
    contentType: "team"
    content: "{{team}}"
    placeholder: "Introduce the key team members who will work on this project..."
    required: false
    conditional:
      field: "includeTeam"
      value: true
  - id: section-case-studies
    type: heading
    level: 1
    content: "Case Studies"
    required: false
    conditional:
      field: "includeCaseStudies"
      value: true
  - id: section-case-studies-content
    type: custom
    contentType: "caseStudies"
    content: "{{caseStudies}}"
    placeholder: "Showcase relevant past projects and their outcomes..."
    required: false
    conditional:
      field: "includeCaseStudies"
      value: true
  - id: section-terms-conditions
    type: heading
    level: 1
    content: "Terms and Conditions"
    required: true
  - id: section-terms-conditions-content
    type: paragraph
    content: "{{termsConditions}}"
    placeholder: "Outline the legal terms and conditions of the proposal..."
    required: true
  - id: section-next-steps
    type: heading
    level: 1
    content: "Next Steps"
    required: true
  - id: section-next-steps-content
    type: paragraph
    content: "{{nextSteps}}"
    placeholder: "Describe what happens next if the proposal is accepted..."
    required: true
  - id: section-appendices
    type: heading
    level: 1
    content: "Appendices"
    required: false
    conditional:
      field: "includeAppendices"
      value: true
  - id: section-appendices-content
    type: custom
    contentType: "appendices"
    content: "{{appendices}}"
    placeholder: "Include any supporting documents or additional information..."
    required: false
    conditional:
      field: "includeAppendices"
      value: true
defaultValues:
  title: "Business Proposal"
  subtitle: ""
  companyName: ""
  companyLogo: ""
  clientName: ""
  authorName: ""
  date: "{{currentDate}}"
  confidentiality: "Confidential"
  executiveSummary: ""
  includeCompanyProfile: true
  companyProfile: ""
  problemStatement: ""
  proposedSolution: ""
  includeMethodology: true
  methodology: ""
  timeline: []
  budget: {
    "currency": "USD",
    "totalAmount": 0,
    "breakdown": []
  }
  includeTeam: true
  team: []
  includeCaseStudies: false
  caseStudies: []
  termsConditions: ""
  nextSteps: ""
  includeAppendices: false
  appendices: []
metadata:
  proposalId: "{{generateId}}"
  version: "1.0"
  status: "Draft"
  expirationDate: "{{expirationDate}}"
  category: ""
  tags: []
```

## Template with Custom Components and Widgets

```yaml
id: template-product-documentation
name: Product Documentation Template
description: A template for creating comprehensive product documentation
version: 2.0.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
structure:
  - id: section-header
    type: custom
    contentType: "documentHeader"
    content: {
      "productName": "{{productName}}",
      "productVersion": "{{productVersion}}",
      "documentType": "{{documentType}}",
      "documentVersion": "{{documentVersion}}",
      "lastUpdated": "{{lastUpdated}}"
    }
    required: true
  - id: section-toc
    type: custom
    contentType: "tableOfContents"
    content: "auto-generated"
    required: true
  - id: section-introduction
    type: heading
    level: 1
    content: "1. Introduction"
    required: true
  - id: section-introduction-content
    type: paragraph
    content: "{{introduction}}"
    placeholder: "Provide an overview of the product and this documentation..."
    required: true
  - id: section-getting-started
    type: heading
    level: 1
    content: "2. Getting Started"
    required: true
  - id: section-getting-started-prerequisites
    type: heading
    level: 2
    content: "2.1 Prerequisites"
    required: true
  - id: section-getting-started-prerequisites-content
    type: custom
    contentType: "prerequisites"
    content: "{{prerequisites}}"
    placeholder: "List all prerequisites for using the product..."
    required: true
  - id: section-getting-started-installation
    type: heading
    level: 2
    content: "2.2 Installation"
    required: true
  - id: section-getting-started-installation-content
    type: custom
    contentType: "installationSteps"
    content: "{{installationSteps}}"
    placeholder: "Provide step-by-step installation instructions..."
    required: true
  - id: section-getting-started-quickstart
    type: heading
    level: 2
    content: "2.3 Quick Start Guide"
    required: true
  - id: section-getting-started-quickstart-content
    type: custom
    contentType: "quickStartGuide"
    content: "{{quickStartGuide}}"
    placeholder: "Provide a quick start guide for new users..."
    required: true
  - id: section-features
    type: heading
    level: 1
    content: "3. Features"
    required: true
  - id: section-features-content
    type: custom
    contentType: "featureList"
    content: "{{features}}"
    placeholder: "Describe the main features of the product..."
    required: true
  - id: section-user-guide
    type: heading
    level: 1
    content: "4. User Guide"
    required: true
  - id: section-user-guide-content
    type: custom
    contentType: "userGuide"
    content: "{{userGuide}}"
    placeholder: "Provide detailed instructions for using the product..."
    required: true
  - id: section-api-reference
    type: heading
    level: 1
    content: "5. API Reference"
    required: false
    conditional:
      field: "includeApiReference"
      value: true
  - id: section-api-reference-content
    type: custom
    contentType: "apiReference"
    content: "{{apiReference}}"
    placeholder: "Document the API endpoints and parameters..."
    required: false
    conditional:
      field: "includeApiReference"
      value: true
  - id: section-troubleshooting
    type: heading
    level: 1
    content: "6. Troubleshooting"
    required: true
  - id: section-troubleshooting-content
    type: custom
    contentType: "troubleshootingGuide"
    content: "{{troubleshooting}}"
    placeholder: "Provide solutions for common issues..."
    required: true
  - id: section-faq
    type: heading
    level: 1
    content: "7. FAQ"
    required: true
  - id: section-faq-content
    type: custom
    contentType: "faq"
    content: "{{faq}}"
    placeholder: "List frequently asked questions and answers..."
    required: true
  - id: section-release-notes
    type: heading
    level: 1
    content: "8. Release Notes"
    required: true
  - id: section-release-notes-content
    type: custom
    contentType: "releaseNotes"
    content: "{{releaseNotes}}"
    placeholder: "Document changes in each version..."
    required: true
  - id: section-glossary
    type: heading
    level: 1
    content: "9. Glossary"
    required: false
  - id: section-glossary-content
    type: custom
    contentType: "glossary"
    content: "{{glossary}}"
    placeholder: "Define key terms used in the documentation..."
    required: false
  - id: section-support
    type: heading
    level: 1
    content: "10. Support"
    required: true
  - id: section-support-content
    type: paragraph
    content: "{{support}}"
    placeholder: "Provide information on how to get support..."
    required: true
defaultValues:
  productName: ""
  productVersion: ""
  documentType: "User Manual"
  documentVersion: "1.0"
  lastUpdated: "{{currentDate}}"
  introduction: ""
  prerequisites: []
  installationSteps: []
  quickStartGuide: ""
  features: []
  userGuide: {}
  includeApiReference: false
  apiReference: {}
  troubleshooting: []
  faq: []
  releaseNotes: []
  glossary: []
  support: ""
metadata:
  audience: "End Users"
  complexity: "Intermediate"
  relatedDocuments: []
  searchTags: []
components:
  - id: component-code-snippet
    type: "codeSnippet"
    properties:
      language: "string"
      code: "string"
      caption: "string"
  - id: component-screenshot
    type: "screenshot"
    properties:
      image: "string"
      caption: "string"
      altText: "string"
  - id: component-video-tutorial
    type: "videoTutorial"
    properties:
      videoUrl: "string"
      caption: "string"
      duration: "string"
  - id: component-interactive-demo
    type: "interactiveDemo"
    properties:
      demoUrl: "string"
      caption: "string"
      instructions: "string"
```

## Template Variations and Inheritance

```yaml
id: template-base-document
name: Base Document Template
description: A base template that other templates can inherit from
version: 1.0.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
structure:
  - id: section-title
    type: heading
    level: 1
    content: "{{title}}"
    required: true
  - id: section-author
    type: paragraph
    content: "By {{author}}"
    required: false
  - id: section-date
    type: paragraph
    content: "{{date}}"
    required: false
  - id: section-abstract
    type: heading
    level: 2
    content: "Abstract"
    required: false
  - id: section-abstract-content
    type: paragraph
    content: "{{abstract}}"
    placeholder: "Write a brief summary here..."
    required: false
  - id: section-content
    type: heading
    level: 2
    content: "Content"
    required: true
  - id: section-content-body
    type: paragraph
    content: "{{content}}"
    placeholder: "Write your content here..."
    required: true
defaultValues:
  title: "Untitled Document"
  author: ""
  date: "{{currentDate}}"
  abstract: ""
  content: ""
```

```yaml
id: template-technical-note
name: Technical Note Template
description: A template for technical notes that inherits from the base document template
version: 1.0.0
createdAt: '2025-03-15T19:30:00.000Z'
updatedAt: '2025-03-15T19:30:00.000Z'
inheritsFrom: "template-base-document"
structure:
  - id: section-technical-details
    type: heading
    level: 2
    content: "Technical Details"
    required: true
    insertAfter: "section-content"
  - id: section-technical-details-content
    type: paragraph
    content: "{{technicalDetails}}"
    placeholder: "Provide technical specifications and details..."
    required: true
  - id: section-code-examples
    type: heading
    level: 2
    content: "Code Examples"
    required: true
  - id: section-code-examples-content
    type: custom
    contentType: "codeExamples"
    content: "{{codeExamples}}"
    placeholder: "Include relevant code examples..."
    required: true
  - id: section-references
    type: heading
    level: 2
    content: "References"
    required: false
  - id: section-references-content
    type: list
    listType: "ordered"
    content: "{{references}}"
    placeholder: "List your references here..."
    required: false
defaultValues:
  title: "Untitled Technical Note"
  technicalDetails: ""
  codeExamples: []
  references: []
metadata:
  category: "Technical"
  tags: []
  reviewStatus: "Draft"
```

## Template Resources

- [[#Basic Composition Template|Basic Template Example]]
- [[#Advanced Composition Template with Nested Sections|Advanced Template Example]]
- [[#Creative Writing Template with Branching Structure|Creative Writing Template]]
- [[#Business Document Template with Dynamic Sections|Business Document Template]]
- [[#Template with Custom Components and Widgets|Product Documentation Template]]
- [[#Template Variations and Inheritance|Template Inheritance Examples]]

---

*This document is for testing purposes and contains examples of composition templates to test UI rendering capabilities.*
