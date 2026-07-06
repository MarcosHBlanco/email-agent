"""Persona templates: rich, edge-case-aware starting points for preferences.

The insight behind these: the hardcoded "Marcos" prompt categorized flawlessly
because it encoded SPECIFIC judgment and edge cases (not just topics) — e.g.
"a tuition-due email from the school is IMPORTANT, but a career-fair invite from
the same school is ROUTINE." A normal user won't think to write rules like that.

So each persona pre-loads that kind of judgment for a role, giving the user a
strong starting point they then personalize with their own named specifics
(their manager's name, their company domain, their school). The template
provides the STRUCTURE and JUDGMENT; the user provides the NAMED ENTITIES.

These fill the same preference fields the categorizer already uses, so seeding
is purely additive — a user can edit every field afterward.
"""

# Each persona seeds the preference fields with rich, role-appropriate defaults.
# The {you fill in} style hints prompt the user to add their own specifics.
PERSONAS = {
    "job_seeker": {
        "label": "Job seeker / student",
        "description": "Applying for jobs, co-ops, or internships",
        "seed": {
            "profession": "Job-seeking professional / student",
            "interests": [
                "career opportunities",
                "recruiting",
                "professional development",
            ],
            "important_senders": "",  # user fills: recruiters, school career office, specific companies
            "important_keywords": "interview, offer, application, deadline, co-op, internship",
            "important_examples": (
                "Replies about jobs I applied to — interviews, callbacks, offers, and "
                "rejections (I need to know either way). Messages from recruiters about "
                "roles that fit what I'm looking for. Career-office or school emails about "
                "opportunities, application deadlines, or required actions. Any message "
                "from a real person about my job search."
            ),
            "routine_examples": (
                "General school or program announcements (events, newsletters, non-urgent "
                "notices). Confirmations that an application was received. Career-fair and "
                "networking-event invitations."
            ),
            "junk_examples": (
                "Job-board digest emails (LinkedIn, Indeed, Glassdoor) UNLESS a listed role "
                "actually matches what I'm looking for — a generic '10 jobs you might like' "
                "with nothing relevant is junk. Cold recruiter outreach for roles unrelated "
                "to my goals. Marketing, promotions, and courses I didn't ask about."
            ),
        },
    },
    "professional": {
        "label": "Working professional",
        "description": "Employed, managing work email day to day",
        "seed": {
            "profession": "Working professional",
            "interests": [
                "my work projects",
                "my industry",
                "professional development",
            ],
            "important_senders": "",  # user fills: manager, direct reports, key clients, their domain
            "important_keywords": "urgent, deadline, action required, meeting, approval",
            "important_examples": (
                "Direct messages from my manager, teammates, and anyone I work with closely. "
                "Anything about my active projects that needs a decision, review, or reply. "
                "Client or customer messages. Meeting invites and schedule changes. Anything "
                "marked urgent or asking for something from me by a date."
            ),
            "routine_examples": (
                "Company-wide announcements and internal newsletters. Automated notifications "
                "from tools I use (tickets, CI, docs) that don't need immediate action. "
                "Receipts and confirmations for things I already know about."
            ),
            "junk_examples": (
                "Marketing and promotional email. Vendor cold outreach and sales pitches I "
                "didn't ask for. Mass newsletters I never read. Event invitations from "
                "companies I have no relationship with."
            ),
        },
    },
    "founder": {
        "label": "Founder / freelancer",
        "description": "Running a business or working independently",
        "seed": {
            "profession": "Founder / freelancer / self-employed",
            "interests": ["my business", "clients", "growth", "operations"],
            "important_senders": "",  # user fills: clients, investors, key partners
            "important_keywords": "invoice, contract, payment, proposal, deadline, client",
            "important_examples": (
                "Anything from current or prospective clients. Payments, invoices, contracts, "
                "and money matters. Messages from partners, investors, or anyone I'm doing a "
                "deal with. Legal, tax, or account/security alerts for my business. Anything "
                "time-sensitive that could cost me money or a client if I miss it."
            ),
            "routine_examples": (
                "Receipts and subscription confirmations for tools I use. Non-urgent platform "
                "notifications. Newsletters I actually read for my industry."
            ),
            "junk_examples": (
                "Cold sales outreach and vendor pitches. Marketing and promotions. Mass "
                "newsletters I don't read. 'Grow your business' spam and unsolicited services."
            ),
        },
    },
    "personal": {
        "label": "Personal inbox",
        "description": "Mostly personal email, not work-focused",
        "seed": {
            "profession": "Managing a personal inbox",
            "interests": [],  # user fills their own
            "important_senders": "",  # user fills: family, friends, doctor, bank, school
            "important_keywords": "appointment, payment due, statement, confirmation needed",
            "important_examples": (
                "Emails from family and friends — real people I know. Anything from my bank "
                "about payments, statements, or unusual activity. Medical: appointments, "
                "results, pharmacy. Government, tax, and official mail. Bills that are due. "
                "My kids' school or daycare, if applicable."
            ),
            "routine_examples": (
                "Order confirmations and shipping updates. Appointment reminders I already "
                "know about. Newsletters I subscribe to and actually read. Loyalty or account "
                "notices that aren't urgent."
            ),
            "junk_examples": (
                "Marketing, sales, and promotional email. Store newsletters and coupons I "
                "don't read. Social media notification digests. Anything that looks like spam."
            ),
        },
    },
    "general": {
        "label": "Something else",
        "description": "I'll set it up myself",
        "seed": {
            "profession": "",
            "interests": [],
            "important_senders": "",
            "important_keywords": "",
            "important_examples": "",
            "routine_examples": "",
            "junk_examples": "",
        },
    },
}


# The interest chip options offered in onboarding (presets + user can add "other").
INTEREST_OPTIONS = [
    "Career & recruiting",
    "My work projects",
    "Finance & investing",
    "Technology",
    "Health & fitness",
    "Family & personal",
    "Education & learning",
    "News & industry",
    "Shopping & deals",
    "Travel",
]


def get_persona_seed(persona_key: str) -> dict:
    """Return the seed preferences for a persona, or the empty 'general' seed."""
    persona = PERSONAS.get(persona_key, PERSONAS["general"])
    # Return a copy so callers can't mutate the template.
    seed = persona["seed"]
    return {
        "profession": seed["profession"],
        "interests": list(seed["interests"]),
        "important_senders": seed["important_senders"],
        "important_keywords": seed["important_keywords"],
        "important_examples": seed["important_examples"],
        "routine_examples": seed["routine_examples"],
        "junk_examples": seed["junk_examples"],
    }
