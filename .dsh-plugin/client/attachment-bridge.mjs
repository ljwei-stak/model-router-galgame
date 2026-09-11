/** Build the image attachment adapter for the active DSH conversation service. */
export function createAttachmentApi(conversation, sessionId) {
  if (conversation === undefined || conversation === null) return undefined

  const hasCurrentApi = typeof conversation.createDrafts === 'function'
    && typeof conversation.resolveDraftAttachments === 'function'
  const hasLegacyApi = typeof conversation.createDraftImages === 'function'
    && typeof conversation.draftImages === 'function'
  if (!hasCurrentApi && !hasLegacyApi) return undefined

  return {
    createDraftImages(files) {
      return hasCurrentApi
        ? conversation.createDrafts(sessionId, files)
        : conversation.createDraftImages(files)
    },
    draftImages(ids) {
      return hasCurrentApi
        ? conversation.resolveDraftAttachments(ids).filter(item => item?.kind === undefined || item.kind === 'image')
        : conversation.draftImages(ids)
    },
    releaseDraftImage(id) {
      if (hasCurrentApi) conversation.releaseDraftAttachment?.(id)
      else conversation.releaseDraftImage?.(id)
    },
    releaseDraftImages(images) {
      if (hasCurrentApi) conversation.releaseDraftAttachments?.(images)
      else conversation.releaseDraftImages?.(images)
    },
  }
}

/** Normalize the DSH 0.1.5 attachment action names and the legacy image API. */
export function createInputAttachmentActions(inputActions) {
  return {
    add(ids) {
      if (typeof inputActions?.addAttachments === 'function') {
        return inputActions.addAttachments(ids)
      }
      if (typeof inputActions?.addImages === 'function') {
        return inputActions.addImages(ids)
      }
      return false
    },
    remove(id) {
      if (typeof inputActions?.removeAttachment === 'function') {
        return inputActions.removeAttachment(id)
      }
      if (typeof inputActions?.removeImage === 'function') {
        return inputActions.removeImage(id)
      }
      return false
    },
  }
}

/** Read attachment ids from either the DSH 0.1.5 state or the legacy state. */
export function inputAttachmentIds(inputState) {
  if (Array.isArray(inputState?.attachmentIds)) return inputState.attachmentIds
  if (Array.isArray(inputState?.imageIds)) return inputState.imageIds
  return []
}
