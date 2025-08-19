import React, { useState } from 'react'
import AITutorChat from '../components/AI/AITutorChat'

export default function AITutoring() {
	const [subjectCode] = useState('9709')
	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">AI 辅导</h1>
			<AITutorChat initialSubject={subjectCode} />
		</div>
	)
}



