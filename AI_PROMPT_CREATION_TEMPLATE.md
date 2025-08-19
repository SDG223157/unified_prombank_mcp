# AI Prompt Creation Template for Prompt House Premium

## 🎯 **Instructions for AI**

When I ask you to create a prompt for my Prompt House Premium app, please follow this template exactly. Create prompts that are well-structured, use variables effectively, and follow best practices for AI prompt engineering.

**Important**: Please provide your response in **Markdown format** (not JSON) as specified below. This makes it easier to read, edit, and import into the system.

---

## 📋 **Required Format**

Please structure your response as a **Markdown document** with these exact sections:

```markdown
# Prompt Title
Clear, descriptive title (50-100 characters)

## Description
Brief description of what this prompt does (100-200 characters)

## Category
Choose ONE from: Development, Business & Communication, Creative & Design, Education & Learning, Health & Fitness, Finance & Investment, Travel & Lifestyle, Entertainment & Media, Food & Cooking, Templates & Frameworks, Other

## Tags
tag1, tag2, tag3, tag4, tag5

## Public
false (or true if you want it public)

## Content
The actual prompt content with {{variables}} - see guidelines below

[Your full prompt content goes here with proper markdown formatting]
```

---

## ✅ **Content Guidelines**

### 🔧 **Variable Usage**
- Use `{{variable_name}}` syntax for customizable parts
- Choose descriptive variable names (e.g., `{{target_audience}}`, `{{writing_style}}`, `{{project_type}}`)
- Include 3-8 variables per prompt for maximum flexibility
- Variables should be clearly integrated into the prompt flow

### 📝 **Prompt Structure**
Your prompt content should include:

1. **Role Definition**: "You are a [expert role]..."
2. **Task Description**: Clear explanation of what to do
3. **Requirements**: Specific guidelines and constraints
4. **Output Format**: How the response should be structured
5. **Examples** (optional): Show expected input/output
6. **Quality Standards**: What makes a good response

### 🎨 **Formatting Best Practices**
- Use markdown formatting (headers, lists, bold, etc.)
- Include emojis for visual organization
- Use clear section breaks with `---` or `##`
- Make it scannable with bullet points and numbered lists

---

## 📊 **Categories & Tags**

### **Categories** (choose ONE):
- **Development**: Code, programming, technical documentation
- **Business & Communication**: Emails, reports, presentations, marketing
- **Creative & Design**: Writing, art, design briefs, creative content
- **Education & Learning**: Tutorials, explanations, study guides
- **Health & Fitness**: Workout plans, nutrition, wellness
- **Finance & Investment**: Analysis, planning, market research
- **Travel & Lifestyle**: Travel guides, lifestyle advice, recommendations
- **Entertainment & Media**: Reviews, scripts, entertainment content
- **Food & Cooking**: Recipes, meal planning, culinary content
- **Templates & Frameworks**: Reusable templates and structures
- **Other**: Anything that doesn't fit above categories

### **Tags** (choose 3-6):
Use specific, searchable keywords like:
- Technical: `javascript`, `python`, `react`, `api`, `database`
- Business: `marketing`, `sales`, `strategy`, `analysis`, `planning`
- Creative: `writing`, `design`, `storytelling`, `branding`, `content`
- General: `templates`, `beginner`, `advanced`, `professional`, `tutorial`

---

## 💡 **Complete Example**

```markdown
# Email Marketing Campaign Generator

## Description
Creates comprehensive email marketing campaigns with subject lines, content, and call-to-actions for businesses

## Category
Business & Communication

## Tags
email-marketing, campaigns, business, copywriting, marketing

## Public
false

## Content
You are a professional email marketing specialist. Create a comprehensive email marketing campaign for {{business_type}} targeting {{target_audience}} to promote {{campaign_objective}}.

## 🎯 **Campaign Requirements:**
- **Business Type**: {{business_type}}
- **Target Audience**: {{target_audience}}
- **Campaign Goal**: {{campaign_objective}}
- **Email Type**: {{email_type}}
- **Brand Voice**: {{brand_voice}}

## 📧 **Email Components:**

### Subject Line Options
Create 3 compelling subject lines that:
- Are under 50 characters
- Create urgency or curiosity
- Are relevant to {{campaign_objective}}

### Email Content Structure:
1. **Opening Hook**: Attention-grabbing first sentence
2. **Value Proposition**: Clear benefit for {{target_audience}}
3. **Main Content**: Detailed information about {{campaign_objective}}
4. **Social Proof**: Testimonials or statistics (if applicable)
5. **Call-to-Action**: Clear, action-oriented CTA button

### Email Footer:
- Unsubscribe link
- Company contact information
- Social media links

## ✅ **Quality Standards:**
- Mobile-responsive design considerations
- Personalization elements using recipient data
- A/B testing suggestions for optimization
- Compliance with email marketing regulations

## 📊 **Additional Deliverables:**
- **Send Time Recommendations**: Best times to send for {{target_audience}}
- **Follow-up Sequence**: 2-3 follow-up email ideas
- **Success Metrics**: KPIs to track campaign performance

Create a professional, conversion-focused email campaign that drives results!
```

---

## 🚀 **Common Variable Examples**

**Content Variables:**
- `{{topic}}`, `{{subject}}`, `{{theme}}`
- `{{target_audience}}`, `{{skill_level}}`, `{{industry}}`
- `{{writing_style}}`, `{{tone}}`, `{{format}}`
- `{{length}}`, `{{word_count}}`, `{{duration}}`

**Technical Variables:**
- `{{programming_language}}`, `{{framework}}`, `{{platform}}`
- `{{project_type}}`, `{{feature_list}}`, `{{requirements}}`
- `{{technology_stack}}`, `{{deployment_target}}`

**Business Variables:**
- `{{company_name}}`, `{{product_name}}`, `{{brand_voice}}`
- `{{market_segment}}`, `{{budget_range}}`, `{{timeline}}`
- `{{business_goals}}`, `{{success_metrics}}`

**Creative Variables:**
- `{{genre}}`, `{{mood}}`, `{{visual_style}}`
- `{{character_type}}`, `{{setting}}`, `{{conflict}}`
- `{{color_scheme}}`, `{{design_approach}}`

---

## ⚠️ **Important Notes**

1. **Keep prompts focused** - Each prompt should have one clear purpose
2. **Make variables meaningful** - Don't overuse variables; use them where customization adds value
3. **Test your thinking** - Consider how different variable values would work
4. **Be specific** - Vague prompts produce vague results
5. **Include context** - Help the AI understand the broader goal
6. **Consider edge cases** - Think about unusual inputs or requirements

---

## 📋 **Quality Checklist**

Before providing your markdown response, ensure:

- [ ] Title is clear and descriptive (50-100 characters)
- [ ] Description explains the prompt's purpose (100-200 characters)
- [ ] Content includes 3-8 well-named variables
- [ ] Prompt has clear structure with role, task, requirements, and output format
- [ ] Category is appropriate and from the approved list
- [ ] 3-6 relevant tags are included (comma-separated)
- [ ] Content uses good markdown formatting
- [ ] Prompt would produce consistent, high-quality results
- [ ] Variables are integrated naturally into the flow
- [ ] Instructions are clear and actionable

---

## 🎯 **Final Request Format**

When you're ready, provide your response in this exact markdown format:

```markdown
# Your Prompt Title Here

## Description
Your prompt description here

## Category
Appropriate Category

## Tags
tag1, tag2, tag3, tag4

## Public
false

## Content
Your full prompt content with {{variables}} here

[Include all the detailed prompt content with proper markdown formatting]
```

**Ready to create amazing prompts for Prompt House Premium!** 🚀
