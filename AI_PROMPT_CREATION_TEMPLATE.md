# AI Prompt Creation Template for Prompt House Premium

## 🎯 **Instructions for AI**

When I ask you to create a prompt for my Prompt House Premium app, please follow this template exactly. Create prompts that are well-structured, use variables effectively, and follow best practices for AI prompt engineering.

---

## 📋 **Required Format**

Please structure your response as a **JSON object** with these exact fields:

```json
{
  "title": "Clear, descriptive title (50-100 characters)",
  "description": "Brief description of what this prompt does (100-200 characters)",
  "content": "The actual prompt content with {{variables}} - see guidelines below",
  "category": "Choose from: Development, Business & Communication, Creative & Design, Education & Learning, Health & Fitness, Finance & Investment, Travel & Lifestyle, Entertainment & Media, Food & Cooking, Templates & Frameworks, Other",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "is_public": false
}
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

## 💡 **Example Prompt Structure**

```
You are a {{expert_role}}. Create a {{deliverable_type}} for {{target_context}} that focuses on {{main_objective}}.

## 🎯 **Requirements:**
- {{requirement_1}}
- {{requirement_2}}  
- {{requirement_3}}

## 📋 **Specifications:**
- **Style**: {{style_preference}}
- **Length**: {{desired_length}}
- **Audience**: {{target_audience}}
- **Format**: {{output_format}}

## ✅ **Quality Standards:**
1. {{quality_standard_1}}
2. {{quality_standard_2}}
3. {{quality_standard_3}}

## 📊 **Output Structure:**
Please provide:
1. **{{section_1}}**: {{section_1_description}}
2. **{{section_2}}**: {{section_2_description}}
3. **{{section_3}}**: {{section_3_description}}

{{additional_instructions}}

Create professional, high-quality content that meets all specified requirements!
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

Before providing your JSON response, ensure:

- [ ] Title is clear and descriptive (50-100 characters)
- [ ] Description explains the prompt's purpose (100-200 characters)
- [ ] Content includes 3-8 well-named variables
- [ ] Prompt has clear structure with role, task, requirements, and output format
- [ ] Category is appropriate and from the approved list
- [ ] 3-6 relevant tags are included
- [ ] Content uses good markdown formatting
- [ ] Prompt would produce consistent, high-quality results
- [ ] Variables are integrated naturally into the flow
- [ ] Instructions are clear and actionable

---

## 🎯 **Final Request Format**

When you're ready, provide your response in this exact format:

```json
{
  "title": "Your Prompt Title Here",
  "description": "Your prompt description here",
  "content": "Your full prompt content with {{variables}} here",
  "category": "Appropriate Category",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "is_public": false
}
```

**Ready to create amazing prompts for Prompt House Premium!** 🚀
