#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env
from scripts.vlm.db_utils import connect  # noqa: E402


def load_env() -> None:
    load_project_env()



def main() -> int:
    load_env()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select status, count(1)
                from vlm_jobs_v0
                group by status
                order by count(1) desc
                """
            )
            job_status = cur.fetchall()

            cur.execute(
                """
                select
                  count(1) as total,
                  count(1) filter (where summary is null or btrim(summary)='') as summary_empty,
                  count(1) filter (
                    where question_type is null
                       or btrim(question_type)=''
                       or question_type not in ('calculation','proof','graph','definition','multiple_choice','explanation','planning','analysis','MCQ','other')
                  ) as qtype_nonstandard,
                  count(1) filter (
                    where answer_form is null
                       or btrim(answer_form)=''
                       or answer_form not in ('exact','approx','proof','graph','table','other')
                  ) as answer_nonstandard,
                  count(1) filter (where storage_key ~* '/questions/contact_sheet\\.png$') as contact_sheet_rows
                from question_descriptions_v0
                """
            )
            total, summary_empty, qtype_nonstandard, answer_nonstandard, contact_sheet_rows = cur.fetchone()

            cur.execute(
                """
                select count(1) from (
                  select distinct storage_key
                  from question_descriptions_v0
                  where storage_key !~* '/questions/contact_sheet\\.png$'
                ) t
                """
            )
            desc_distinct_non_contact = cur.fetchone()[0]

            cur.execute(
                """
                select count(1)
                from vlm_jobs_v0
                where status='done'
                  and storage_key !~* '/questions/contact_sheet\\.png$'
                """
            )
            jobs_done_non_contact = cur.fetchone()[0]

            print("jobs_status:", job_status)
            print("descriptions_total:", total)
            print("summary_empty:", summary_empty)
            print("qtype_nonstandard:", qtype_nonstandard)
            print("answer_nonstandard:", answer_nonstandard)
            print("contact_sheet_rows:", contact_sheet_rows)
            print("distinct_non_contact_descriptions:", desc_distinct_non_contact)
            print("jobs_done_non_contact:", jobs_done_non_contact)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
