import { supabase } from '../lib/supabase';

export type FeedbackQuestionType = 'rating' | 'multiple_choice' | 'text';
export type FeedbackFormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export interface FeedbackQuestion {
  id: string;
  formId: string;
  questionText: string;
  questionType: FeedbackQuestionType;
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  status: FeedbackFormStatus;
  deadline?: string | null;
  createdBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: FeedbackQuestion[];
  responseCount?: number;
  hasSubmitted?: boolean;
}

export interface FeedbackAnswer {
  id?: string;
  questionId: string;
  ratingValue?: number | null;
  selectedOption?: string | null;
  textResponse?: string | null;
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  parentId: string;
  parentName?: string;
  parentPhone?: string;
  submittedAt: string;
  answers: FeedbackAnswer[];
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  questionType: FeedbackQuestionType;
  averageRating?: number;
  ratingCounts?: Record<number, number>;
  optionCounts?: Record<string, number>;
  textResponses?: { parentName: string; text: string; date: string }[];
}

export interface FeedbackStats {
  totalResponses: number;
  questionStats: QuestionStat[];
}

// 7 Pre-configured Institutional Topics for 1-Click Form Creation
export interface FeedbackTopicTemplate {
  title: string;
  category: string;
  description: string;
  questions: {
    questionText: string;
    questionType: FeedbackQuestionType;
    options?: string[];
    isRequired: boolean;
  }[];
}

export const FEEDBACK_TEMPLATES: FeedbackTopicTemplate[] = [
  {
    title: 'College Infrastructure & Classroom Facilities',
    category: 'College Infrastructure',
    description: 'We welcome parent feedback regarding campus academic blocks, classroom ventilation, smart boards, laboratories, and physical infrastructure.',
    questions: [
      {
        questionText: 'How would you rate the condition of classroom infrastructure and learning amenities?',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'How satisfied are you with laboratory equipment and computing facilities?',
        questionType: 'multiple_choice',
        options: ['Highly Satisfied', 'Satisfied', 'Neutral', 'Needs Improvement'],
        isRequired: true,
      },
      {
        questionText: 'Please share any specific suggestions to improve college buildings and classroom equipment:',
        questionType: 'text',
        isRequired: false,
      },
    ],
  },
  {
    title: 'Transportation & Campus Bus Fleet Facilities',
    category: 'Transportation Facilities',
    description: 'Evaluating route coverage, punctuality, student safety, and cleanliness of college transport services.',
    questions: [
      {
        questionText: 'Rate the overall reliability and punctuality of the college bus transport system:',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'Are the pickup and drop-off timings convenient for your ward?',
        questionType: 'multiple_choice',
        options: ['Always on Time', 'Mostly on Time', 'Frequently Delayed', 'Not Using Transport'],
        isRequired: true,
      },
      {
        questionText: 'How would you rate driver discipline, conductor support, and onboard safety measures?',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'What improvements or route extensions would you suggest for the college transport system?',
        questionType: 'text',
        isRequired: false,
      },
    ],
  },
  {
    title: 'Hostel Accommodation & Dining Facilities',
    category: 'Hostel Facilities',
    description: 'Reviewing hostel room conditions, hygienic food quality, security, and student residential welfare.',
    questions: [
      {
        questionText: 'Rate the hygiene, nutritional balance, and taste of the hostel mess food:',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'How would you rate hostel warden accessibility and student support?',
        questionType: 'multiple_choice',
        options: ['Excellent', 'Good', 'Adequate', 'Inadequate'],
        isRequired: true,
      },
      {
        questionText: 'Rate room cleanliness, laundry facilities, and water availability:',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'Additional comments regarding hostel rules, study hours, or dining improvements:',
        questionType: 'text',
        isRequired: false,
      },
    ],
  },
  {
    title: 'Library & Digital Academic Learning Resources',
    category: 'Library Facilities',
    description: 'Feedback on textbook availability, digital reference journals, reading room hours, and study atmosphere.',
    questions: [
      {
        questionText: 'Rate the accessibility of curriculum textbooks, reference guides, and journals in the library:',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'Does your ward have sufficient access to online research papers and digital library portals?',
        questionType: 'multiple_choice',
        options: ['Fully Sufficient', 'Moderately Sufficient', 'Insufficient', 'Unaware'],
        isRequired: true,
      },
      {
        questionText: 'Any recommendations for library books, seating capacity, or extended hours during examinations:',
        questionType: 'text',
        isRequired: false,
      },
    ],
  },
  {
    title: 'Campus Cleanliness, Greenery & Hygiene Standards',
    category: 'Campus Cleanliness',
    description: 'Evaluating washroom sanitation, campus waste management, eco-friendly practices, and general hygiene.',
    questions: [
      {
        questionText: 'How do you rate the cleanliness and sanitation of campus washrooms and common spaces?',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'Rate the drinking water filtration and cafeteria cleanliness standards:',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'Observations or suggestions concerning college cleanliness and green initiatives:',
        questionType: 'text',
        isRequired: false,
      },
    ],
  },
  {
    title: 'Student Safety, Campus Security & Discipline',
    category: 'Student Safety',
    description: 'Feedback on campus surveillance, gate control, anti-ragging measures, and student well-being.',
    questions: [
      {
        questionText: 'How secure do you feel your child is on the college campus and during commute?',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'How would you rate the college anti-ragging committee and emergency response preparedness?',
        questionType: 'multiple_choice',
        options: ['Very Strong', 'Satisfactory', 'Needs Strictness', 'Not Aware'],
        isRequired: true,
      },
      {
        questionText: 'Any security measures you recommend for campus entry, visitor screening, or evening safety?',
        questionType: 'text',
        isRequired: false,
      },
    ],
  },
  {
    title: 'Overall College Facilities & Parent Satisfaction',
    category: 'Parent Satisfaction',
    description: 'Comprehensive evaluation of parent-college communication, administrative responsiveness, and overall growth.',
    questions: [
      {
        questionText: 'Rate your overall satisfaction with the institution as a parent:',
        questionType: 'rating',
        isRequired: true,
      },
      {
        questionText: 'How timely and transparent is communication from the college administration regarding academic updates?',
        questionType: 'multiple_choice',
        options: ['Extremely Timely', 'Prompt', 'Delayed at Times', 'Poor Communication'],
        isRequired: true,
      },
      {
        questionText: 'What key improvements would you like the College Management Committee (CMC) to prioritize next semester?',
        questionType: 'text',
        isRequired: true,
      },
    ],
  },
];

// Fallback in-memory / local storage seed items
const LOCAL_STORAGE_FORMS_KEY = 'campuscare_feedback_forms_v1';
const LOCAL_STORAGE_RESPONSES_KEY = 'campuscare_feedback_responses_v1';

function getLocalForms(): FeedbackForm[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FORMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Default seed forms if nothing in storage
  const defaultDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const seedForms: FeedbackForm[] = [
    {
      id: 'form-infra-001',
      title: 'College Infrastructure & Campus Facilities Feedback',
      description: 'The college administration invites all parents to evaluate physical learning infrastructure, classroom air ventilation, lab facilities, and campus amenities to help plan our semester upgrades.',
      targetAudience: 'ALL_PARENTS',
      status: 'PUBLISHED',
      deadline: defaultDeadline,
      createdBy: '73e4a745-374e-4911-8297-b57fc00d9e47',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      questions: [
        {
          id: 'q-infra-1',
          formId: 'form-infra-001',
          questionText: 'How would you rate the condition of classroom infrastructure and digital learning facilities?',
          questionType: 'rating',
          options: [],
          isRequired: true,
          orderIndex: 0,
        },
        {
          id: 'q-infra-2',
          formId: 'form-infra-001',
          questionText: 'How satisfied are you with the college computing laboratories and equipment maintenance?',
          questionType: 'multiple_choice',
          options: ['Highly Satisfied', 'Satisfied', 'Neutral', 'Needs Improvement'],
          isRequired: true,
          orderIndex: 1,
        },
        {
          id: 'q-infra-3',
          formId: 'form-infra-001',
          questionText: 'Please share any specific suggestions to improve college buildings and classroom equipment:',
          questionType: 'text',
          options: [],
          isRequired: false,
          orderIndex: 2,
        },
      ],
    },
    {
      id: 'form-transport-002',
      title: 'Transportation & Campus Bus Fleet Safety Review',
      description: 'Evaluating route coverage, punctuality, student safety, and cleanliness of college transport services.',
      targetAudience: 'ALL_PARENTS',
      status: 'PUBLISHED',
      deadline: defaultDeadline,
      createdBy: '73e4a745-374e-4911-8297-b57fc00d9e47',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      questions: [
        {
          id: 'q-trans-1',
          formId: 'form-transport-002',
          questionText: 'Rate the overall reliability and punctuality of the college bus transport system:',
          questionType: 'rating',
          options: [],
          isRequired: true,
          orderIndex: 0,
        },
        {
          id: 'q-trans-2',
          formId: 'form-transport-002',
          questionText: 'Are the pickup and drop-off timings convenient for your ward?',
          questionType: 'multiple_choice',
          options: ['Always on Time', 'Mostly on Time', 'Frequently Delayed', 'Not Using Transport'],
          isRequired: true,
          orderIndex: 1,
        },
        {
          id: 'q-trans-3',
          formId: 'form-transport-002',
          questionText: 'What improvements or route extensions would you suggest for the college transport system?',
          questionType: 'text',
          options: [],
          isRequired: false,
          orderIndex: 2,
        },
      ],
    },
    {
      id: 'form-hostel-003',
      title: 'Hostel Accommodation & Dining Hygiene Review (Draft)',
      description: 'Comprehensive review of hostel dining hall cleanliness, menu balance, and resident security.',
      targetAudience: 'ALL_PARENTS',
      status: 'DRAFT',
      deadline: defaultDeadline,
      createdBy: '73e4a745-374e-4911-8297-b57fc00d9e47',
      publishedAt: null,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      questions: [
        {
          id: 'q-hostel-1',
          formId: 'form-hostel-003',
          questionText: 'Rate the hygiene, nutritional balance, and taste of the hostel mess food:',
          questionType: 'rating',
          options: [],
          isRequired: true,
          orderIndex: 0,
        },
        {
          id: 'q-hostel-2',
          formId: 'form-hostel-003',
          questionText: 'How would you rate hostel warden accessibility and student support?',
          questionType: 'multiple_choice',
          options: ['Excellent', 'Good', 'Adequate', 'Inadequate'],
          isRequired: true,
          orderIndex: 1,
        },
      ],
    },
  ];

  try {
    localStorage.setItem(LOCAL_STORAGE_FORMS_KEY, JSON.stringify(seedForms));
  } catch {}

  return seedForms;
}

function saveLocalForms(forms: FeedbackForm[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_FORMS_KEY, JSON.stringify(forms));
  } catch {}
}

function getLocalResponses(): FeedbackResponse[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESPONSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalResponses(responses: FeedbackResponse[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_RESPONSES_KEY, JSON.stringify(responses));
  } catch {}
}

/**
 * Fetch all feedback forms.
 * For Admin: returns all forms (Draft, Published, Closed).
 * For Parent: returns Published and Closed forms, annotating if already submitted.
 */
export async function getFeedbackForms(
  role: 'ADMIN' | 'PARENT',
  parentId?: string
): Promise<FeedbackForm[]> {
  // Try querying Supabase live database
  try {
    let query = supabase.from('feedback_forms').select(`
      id,
      title,
      description,
      target_audience,
      status,
      deadline,
      created_by,
      published_at,
      created_at,
      updated_at,
      feedback_questions (
        id,
        form_id,
        question_text,
        question_type,
        options,
        is_required,
        order_index
      ),
      feedback_responses (
        id,
        parent_id,
        submitted_at
      )
    `);

    if (role === 'PARENT') {
      query = query.in('status', ['PUBLISHED', 'CLOSED']);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => {
        const questions: FeedbackQuestion[] = (item.feedback_questions || [])
          .map((q: any) => ({
            id: q.id,
            formId: q.form_id,
            questionText: q.question_text,
            questionType: q.question_type,
            options: Array.isArray(q.options) ? q.options : [],
            isRequired: q.is_required,
            orderIndex: q.order_index,
          }))
          .sort((a: FeedbackQuestion, b: FeedbackQuestion) => a.orderIndex - b.orderIndex);

        const responses = item.feedback_responses || [];
        const hasSubmitted = parentId
          ? responses.some((r: any) => r.parent_id === parentId)
          : false;

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          targetAudience: item.target_audience,
          status: item.status,
          deadline: item.deadline,
          createdBy: item.created_by,
          publishedAt: item.published_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          questions,
          responseCount: responses.length,
          hasSubmitted,
        };
      });
    }
  } catch (err) {
    console.warn('Supabase feedback_forms query fell back to local store:', err);
  }

  // Graceful fallback to persistent storage
  const allForms = getLocalForms();
  const allResponses = getLocalResponses();

  const filteredForms = role === 'ADMIN'
    ? allForms
    : allForms.filter(f => f.status === 'PUBLISHED' || f.status === 'CLOSED');

  return filteredForms.map(f => {
    const responsesForForm = allResponses.filter(r => r.formId === f.id);
    const hasSubmitted = parentId
      ? responsesForForm.some(r => r.parentId === parentId)
      : false;

    return {
      ...f,
      responseCount: responsesForForm.length,
      hasSubmitted,
    };
  });
}

/**
 * Fetch a single form's details with questions and the parent's prior response if any.
 */
export async function getFormDetails(
  formId: string,
  parentId?: string
): Promise<{ form: FeedbackForm; myResponse?: FeedbackResponse } | null> {
  // Try Supabase first
  try {
    const { data: formData, error: formError } = await supabase
      .from('feedback_forms')
      .select(`
        id,
        title,
        description,
        target_audience,
        status,
        deadline,
        created_by,
        published_at,
        created_at,
        updated_at,
        feedback_questions (
          id,
          form_id,
          question_text,
          question_type,
          options,
          is_required,
          order_index
        )
      `)
      .eq('id', formId)
      .single();

    if (!formError && formData) {
      const questions: FeedbackQuestion[] = (formData.feedback_questions || [])
        .map((q: any) => ({
          id: q.id,
          formId: q.form_id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: Array.isArray(q.options) ? q.options : [],
          isRequired: q.is_required,
          orderIndex: q.order_index,
        }))
        .sort((a: FeedbackQuestion, b: FeedbackQuestion) => a.orderIndex - b.orderIndex);

      let myResponse: FeedbackResponse | undefined = undefined;

      if (parentId) {
        const { data: respData, error: respError } = await supabase
          .from('feedback_responses')
          .select(`
            id,
            form_id,
            parent_id,
            submitted_at,
            feedback_answers (
              id,
              question_id,
              rating_value,
              selected_option,
              text_response
            )
          `)
          .eq('form_id', formId)
          .eq('parent_id', parentId)
          .maybeSingle();

        if (!respError && respData) {
          myResponse = {
            id: respData.id,
            formId: respData.form_id,
            parentId: respData.parent_id,
            submittedAt: respData.submitted_at,
            answers: (respData.feedback_answers || []).map((a: any) => ({
              id: a.id,
              questionId: a.question_id,
              ratingValue: a.rating_value,
              selectedOption: a.selected_option,
              textResponse: a.text_response,
            })),
          };
        }
      }

      const form: FeedbackForm = {
        id: formData.id,
        title: formData.title,
        description: formData.description,
        targetAudience: formData.target_audience,
        status: formData.status,
        deadline: formData.deadline,
        createdBy: formData.created_by,
        publishedAt: formData.published_at,
        createdAt: formData.created_at,
        updatedAt: formData.updated_at,
        questions,
        hasSubmitted: !!myResponse,
      };

      return { form, myResponse };
    }
  } catch {}

  // Fallback
  const allForms = getLocalForms();
  const form = allForms.find(f => f.id === formId);
  if (!form) return null;

  let myResponse: FeedbackResponse | undefined = undefined;
  if (parentId) {
    const allResponses = getLocalResponses();
    myResponse = allResponses.find(r => r.formId === formId && r.parentId === parentId);
  }

  return {
    form: {
      ...form,
      hasSubmitted: !!myResponse,
    },
    myResponse,
  };
}

/**
 * Create a new feedback form (Draft or Published).
 */
export async function createFeedbackForm(params: {
  title: string;
  description: string;
  deadline?: string | null;
  targetAudience?: string;
  publishImmediately?: boolean;
  adminId?: string;
  questions: {
    questionText: string;
    questionType: FeedbackQuestionType;
    options?: string[];
    isRequired: boolean;
  }[];
}): Promise<{ success: boolean; form?: FeedbackForm; error?: string }> {
  const formId = `form-${Date.now()}`;
  const now = new Date().toISOString();
  const status: FeedbackFormStatus = params.publishImmediately ? 'PUBLISHED' : 'DRAFT';

  // Try creating in Supabase
  try {
    const { data: dbForm, error: formErr } = await supabase
      .from('feedback_forms')
      .insert({
        title: params.title.trim(),
        description: params.description.trim(),
        target_audience: params.targetAudience || 'ALL_PARENTS',
        status,
        deadline: params.deadline || null,
        created_by: params.adminId || null,
        published_at: params.publishImmediately ? now : null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!formErr && dbForm) {
      // Insert questions
      const questionPayload = params.questions.map((q, idx) => ({
        form_id: dbForm.id,
        question_text: q.questionText.trim(),
        question_type: q.questionType,
        options: q.options || [],
        is_required: q.isRequired ?? true,
        order_index: idx,
      }));

      await supabase.from('feedback_questions').insert(questionPayload);

      // If published immediately, notify parents
      if (status === 'PUBLISHED') {
        await broadcastNotificationToParents({
          id: dbForm.id,
          title: dbForm.title,
          description: dbForm.description,
          targetAudience: dbForm.target_audience,
          status: 'PUBLISHED',
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        success: true,
        form: {
          id: dbForm.id,
          title: dbForm.title,
          description: dbForm.description,
          targetAudience: dbForm.target_audience,
          status: dbForm.status,
          deadline: dbForm.deadline,
          createdAt: dbForm.created_at,
          updatedAt: dbForm.updated_at,
          publishedAt: dbForm.published_at,
        },
      };
    }
  } catch (err) {
    console.warn('Supabase form creation fallback to local storage:', err);
  }

  // Fallback to local storage
  const formattedQuestions: FeedbackQuestion[] = params.questions.map((q, idx) => ({
    id: `q-${Date.now()}-${idx}`,
    formId,
    questionText: q.questionText.trim(),
    questionType: q.questionType,
    options: q.options || [],
    isRequired: q.isRequired,
    orderIndex: idx,
  }));

  const newForm: FeedbackForm = {
    id: formId,
    title: params.title.trim(),
    description: params.description.trim(),
    targetAudience: params.targetAudience || 'ALL_PARENTS',
    status,
    deadline: params.deadline || null,
    createdBy: params.adminId || null,
    publishedAt: params.publishImmediately ? now : null,
    createdAt: now,
    updatedAt: now,
    questions: formattedQuestions,
    responseCount: 0,
    hasSubmitted: false,
  };

  const forms = getLocalForms();
  forms.unshift(newForm);
  saveLocalForms(forms);

  // If published immediately, trigger parent notification in Supabase
  if (status === 'PUBLISHED') {
    await broadcastNotificationToParents(newForm);
  }

  return { success: true, form: newForm };
}

/**
 * Update the status of a form (DRAFT -> PUBLISHED, PUBLISHED -> CLOSED, etc.)
 */
export async function updateFeedbackFormStatus(
  formId: string,
  newStatus: FeedbackFormStatus
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // Try Supabase
  try {
    const updatePayload: any = {
      status: newStatus,
      updated_at: now,
    };
    if (newStatus === 'PUBLISHED') {
      updatePayload.published_at = now;
    }

    const { error } = await supabase
      .from('feedback_forms')
      .update(updatePayload)
      .eq('id', formId);

    if (!error) {
      if (newStatus === 'PUBLISHED') {
        const details = await getFormDetails(formId);
        if (details?.form) {
          await broadcastNotificationToParents(details.form);
        }
      }
      return { success: true };
    }
  } catch {}

  // Fallback
  const forms = getLocalForms();
  const form = forms.find(f => f.id === formId);
  if (!form) return { success: false, error: 'Form not found.' };

  form.status = newStatus;
  form.updatedAt = now;
  if (newStatus === 'PUBLISHED') {
    form.publishedAt = now;
  }
  saveLocalForms(forms);

  if (newStatus === 'PUBLISHED') {
    await broadcastNotificationToParents(form);
  }

  return { success: true };
}

/**
 * Submit parent responses for a published feedback form.
 */
export async function submitFeedbackResponse(params: {
  formId: string;
  parentId: string;
  parentName?: string;
  parentPhone?: string;
  answers: {
    questionId: string;
    ratingValue?: number | null;
    selectedOption?: string | null;
    textResponse?: string | null;
  }[];
}): Promise<{ success: boolean; responseId?: string; error?: string }> {
  const now = new Date().toISOString();

  // Try Supabase insertion
  try {
    const { data: respData, error: respErr } = await supabase
      .from('feedback_responses')
      .insert({
        form_id: params.formId,
        parent_id: params.parentId,
        submitted_at: now,
        created_at: now,
      })
      .select()
      .single();

    if (!respErr && respData) {
      const answersPayload = params.answers.map(ans => ({
        response_id: respData.id,
        question_id: ans.questionId,
        rating_value: ans.ratingValue ?? null,
        selected_option: ans.selectedOption ?? null,
        text_response: ans.textResponse ?? null,
      }));

      await supabase.from('feedback_answers').insert(answersPayload);
      return { success: true, responseId: respData.id };
    } else if (respErr && (respErr.code === '23505' || respErr.message?.includes('duplicate key'))) {
      return { success: false, error: 'You have already submitted feedback for this form.' };
    }
  } catch {}

  // Fallback to local storage
  const allResponses = getLocalResponses();
  const existing = allResponses.find(
    r => r.formId === params.formId && r.parentId === params.parentId
  );
  if (existing) {
    return { success: false, error: 'You have already submitted feedback for this form.' };
  }

  const responseId = `resp-${Date.now()}`;
  const newResponse: FeedbackResponse = {
    id: responseId,
    formId: params.formId,
    parentId: params.parentId,
    parentName: params.parentName || 'Parent',
    parentPhone: params.parentPhone || '',
    submittedAt: now,
    answers: params.answers.map((a, idx) => ({
      id: `ans-${Date.now()}-${idx}`,
      questionId: a.questionId,
      ratingValue: a.ratingValue ?? null,
      selectedOption: a.selectedOption ?? null,
      textResponse: a.textResponse ?? null,
    })),
  };

  allResponses.unshift(newResponse);
  saveLocalResponses(allResponses);

  return { success: true, responseId };
}

/**
 * Fetch aggregated responses & statistics for a given form (for Admin view).
 */
export async function getFormResponsesAndStats(
  formId: string
): Promise<{ form: FeedbackForm; responses: FeedbackResponse[]; stats: FeedbackStats } | null> {
  const formDetails = await getFormDetails(formId);
  if (!formDetails) return null;
  const { form } = formDetails;

  let responses: FeedbackResponse[] = [];

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('feedback_responses')
      .select(`
        id,
        form_id,
        parent_id,
        submitted_at,
        profiles (
          full_name,
          phone
        ),
        feedback_answers (
          id,
          question_id,
          rating_value,
          selected_option,
          text_response
        )
      `)
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      responses = data.map((r: any) => ({
        id: r.id,
        formId: r.form_id,
        parentId: r.parent_id,
        parentName: r.profiles?.full_name || 'Parent',
        parentPhone: r.profiles?.phone || '',
        submittedAt: r.submitted_at,
        answers: (r.feedback_answers || []).map((a: any) => ({
          id: a.id,
          questionId: a.question_id,
          ratingValue: a.rating_value,
          selectedOption: a.selected_option,
          textResponse: a.text_response,
        })),
      }));
    }
  } catch {}

  if (responses.length === 0) {
    const allResponses = getLocalResponses();
    responses = allResponses.filter(r => r.formId === formId);
  }

  // Calculate statistics
  const questionStats: QuestionStat[] = (form.questions || []).map(q => {
    const answersForQ = responses.flatMap(r =>
      r.answers.filter(a => a.questionId === q.id).map(a => ({ ...a, parentName: r.parentName || 'Parent', date: r.submittedAt }))
    );

    if (q.questionType === 'rating') {
      const validRatings = answersForQ
        .map(a => a.ratingValue)
        .filter((r): r is number => typeof r === 'number' && r >= 1 && r <= 5);

      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      validRatings.forEach(r => {
        ratingCounts[r] = (ratingCounts[r] || 0) + 1;
      });

      const averageRating =
        validRatings.length > 0
          ? Number((validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length).toFixed(1))
          : 0;

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: 'rating',
        averageRating,
        ratingCounts,
      };
    }

    if (q.questionType === 'multiple_choice') {
      const optionCounts: Record<string, number> = {};
      q.options.forEach(opt => {
        optionCounts[opt] = 0;
      });

      answersForQ.forEach(a => {
        if (a.selectedOption) {
          optionCounts[a.selectedOption] = (optionCounts[a.selectedOption] || 0) + 1;
        }
      });

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: 'multiple_choice',
        optionCounts,
      };
    }

    // Text response
    const textResponses = answersForQ
      .filter(a => !!a.textResponse && a.textResponse.trim().length > 0)
      .map(a => ({
        parentName: a.parentName,
        text: a.textResponse!.trim(),
        date: a.date,
      }));

    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: 'text',
      textResponses,
    };
  });

  const stats: FeedbackStats = {
    totalResponses: responses.length,
    questionStats,
  };

  return { form, responses, stats };
}

/**
 * Broadcast notifications to all verified parent accounts when a feedback form is published.
 * Integrates directly with the existing `notifications` table!
 */
export async function broadcastNotificationToParents(form: FeedbackForm): Promise<number> {
  let count = 0;
  try {
    // 1. Fetch parent accounts from Supabase profiles
    const { data: parents, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'PARENT');

    if (!pErr && parents && parents.length > 0) {
      const notificationsToInsert = parents.map(p => ({
        user_id: p.id,
        title: `College Feedback: ${form.title}`,
        message: `Administration invites your feedback on "${form.title}". Complete this short form to help guide campus improvements.`,
        type: 'info',
        submission_id: `FB-${form.id}`,
        read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert in chunks of 50
      for (let i = 0; i < notificationsToInsert.length; i += 50) {
        const chunk = notificationsToInsert.slice(i, i + 50);
        const { error: insErr } = await supabase.from('notifications').insert(chunk);
        if (!insErr) {
          count += chunk.length;
        }
      }
    }
  } catch (err) {
    console.warn('Could not broadcast notifications to parent profiles:', err);
  }
  return count;
}
